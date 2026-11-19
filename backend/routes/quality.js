
const express = require('express');
const router = express.Router();
const db = require('../db');

// multer가 이미지 파일을 저장하기 위한 코드
const fs = require("fs"); // 업로드 실패 시 파일 정리
const createImageUpload = require("../middleware/imageUpload");
const upload = createImageUpload("Images");

//제품 목록 조회
router.get('/products', (req,res) => {
    
const sql = `
    SELECT
        p.product_id,
        p.product_code,
        p.product_name,
        p.product_type,
        p.company,
        p.price,
        p.stock,
        p.image_url,
        p.variant_text,
        COALESCE(i.quality_status, '미실시') AS quality_status,
        DATE_FORMAT(i.created_at, '%Y-%m-%d / %H:%i:%s') AS created_at,
        i.inspector,
        i.memo
    FROM quality_products p
    LEFT JOIN quality_inspections i
        ON i.inspection_id = (
            SELECT i2.inspection_id
            FROM quality_inspections i2
            WHERE i2.product_id = p.product_id
            ORDER BY i2.created_at DESC, i2.inspection_id DESC
            LIMIT 1
        )
    ORDER BY p.product_id
    `;


     db.query(sql, (err, data) => {
        if(err){
            console.log('상품 정보를 불러올 수 없습니다');
            return res.status(500).json({
                message: '상품 정보를 불러올 수 없습니다'
            });
        }

        res.json(data);
     
    })}
)


router.post("/products", (req, res) => {
    upload.single("image")(req, res, (uploadError) => {
        if (uploadError) {
            return res.status(400).json({
                message: uploadError.code === "LIMIT_FILE_SIZE"
                    ? "이미지는 5MB 이하만 첨부할 수 있습니다."
                    : uploadError.message
            });
        }

        const {
            productCode,
            productName,
            company,
            price,
            stock,
            variantText
        } = req.body;

        const removeImage = () => {
            if (req.file) {
                fs.unlink(req.file.path, () => {});
            }
        };

        const parsedPrice = Number(price);
        const parsedStock = Number(stock);

        if (
            !productCode?.trim() ||
            !productName?.trim() ||
            price === "" || price == null ||
            stock === "" || stock == null ||
            !Number.isSafeInteger(parsedPrice) ||
            !Number.isSafeInteger(parsedStock) ||
            parsedPrice < 0 ||
            parsedStock < 0
        ) {
            removeImage();
            return res.status(400).json({
                message: "제품명, 제품코드, 가격, 재고를 확인해주세요."
            });
        }

        // 이미지 경로 DB에 저장
        const imageUrl = req.file ? `${req.protocol}://${req.get("host")}/Images/${req.file.filename}` : null;

        const sql = `
            INSERT INTO quality_products
            (
                product_code,
                product_name,
                product_type,
                company,
                price,
                stock,
                image_url,
                variant_text
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            productCode.trim(),
            productName.trim(),
            "화장품",
            company?.trim() || null,
            parsedPrice,
            parsedStock,
            imageUrl,
            variantText?.trim() || null
        ];

        db.query(sql, values, (err, result) => {
            if (err) {
                removeImage();
                console.error("db 제품등록 오류:", err);

                return res.status(
                    err.code === "ER_DUP_ENTRY" ? 409 : 500
                ).json({
                    message: err.code === "ER_DUP_ENTRY"
                        ? "이미 등록된 제품코드입니다."
                        : "제품등록 실패"
                });
            }

            res.status(201).json({
                message: "db 제품등록 성공",
                productId: result.insertId,
                imageUrl
            });
        });
    });
});


router.get("/calendar/events", (req, res) => {
    const sql = `
        SELECT
            CONCAT('planned-', p.product_id) AS event_id,
            p.product_id,
            p.product_code,
            p.product_name,
            DATE_FORMAT(p.next_inspection_date, '%Y-%m-%d') AS event_date,

            CASE
                WHEN EXISTS (
                    SELECT 1
                    FROM quality_inspections h
                    WHERE h.product_id = p.product_id
                )
                THEN '재검사 예정'
                ELSE '검사 예정'
            END AS event_type,

            COALESCE((
                SELECT i.quality_status
                FROM quality_inspections i
                WHERE i.product_id = p.product_id
                ORDER BY i.created_at DESC, i.inspection_id DESC
                LIMIT 1
            ), '미실시') AS quality_status

        FROM quality_products p
        WHERE p.next_inspection_date IS NOT NULL

        UNION ALL

        SELECT
            CONCAT('completed-', i.inspection_id) AS event_id,
            p.product_id,
            p.product_code,
            p.product_name,
            DATE_FORMAT(i.created_at, '%Y-%m-%d') AS event_date,
            '검사 완료' AS event_type,
            i.quality_status

        FROM quality_inspections i
        INNER JOIN quality_products p
            ON p.product_id = i.product_id

        WHERE i.created_at IS NOT NULL
          AND i.quality_status IN ('통과', '불합격')

        ORDER BY event_date, event_id
    `;

    db.query(sql, (err, rows) => {
        if (err) {
            console.error("품질 캘린더 조회 오류:", err);
            return res.status(500).json({
                message: "품질 검사 일정을 불러오지 못했습니다."
            });
        }

        res.json(rows);
    });
    // concat product_id와 해당 문자열 합치는 것
});


    
router.post('/inspections', (req, res) => {
    console.log('체크리스트 저장 시작')

    const {
        productId, inspector,
        qualityStatus, failReason, memo,
        qualityScore, checklist
    } = req.body;

    if (!productId || !inspector || !Array.isArray(checklist) || !checklist.length) {
        return res.status(400).json({ message: "필수 정보가 없습니다." });
    }

    // 1. 품질검사 정보 저장
    const sql = `
        INSERT INTO quality_inspections
        (product_id, inspector, quality_status,
         fail_reason, memo, quality_score, created_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW() )
    `;

    const values = [
        productId, inspector, qualityStatus,
        failReason || null, memo || "", qualityScore
    ];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "검사 저장 실패" });
        }

        // 2. 체크리스트 저장
        const items = checklist.map(item => [
            result.insertId,
            item.name,
            item.description || "",
            item.result,
            item.custom ? 1 : 0
        ]);

        console.log('체크리스트 저장 성공',result);
        console.log('체크리스트 저장 성공',items);

        const itemSql = `
            INSERT INTO quality_inspection_items
            (inspection_id, item_name, description, result, is_custom)
            VALUES ?
        `;

        const values = [items];

        db.query(itemSql, values, (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "체크리스트 저장 실패" });
            }

            res.status(201).json({ message: "저장 완료" });
        });
    });
});


router.patch("/products/:id/next-inspection", (req, res) => {
    const productId = Number(req.params.id);
    const { nextInspectionDate } = req.body;

    // 제품 ID 검사
    if (!Number.isInteger(productId) || productId <= 0) {
        return res.status(400).json({ message: "잘못된 제품 ID입니다." });
    }

    // 날짜 형식 검사 (빈 값은 허용)
    if (nextInspectionDate && !/^\d{4}-\d{2}-\d{2}$/.test(nextInspectionDate)) {
        return res.status(400).json({ message: "날짜 형식이 올바르지 않습니다." });
    }

    const sql = `
        UPDATE quality_products
        SET next_inspection_date = ?
        WHERE product_id = ?
    `;

    db.query(sql, [nextInspectionDate || null, productId], (err, result) => {
        if (err) {
            console.error("검사 일정 저장 오류:", err);
            return res.status(500).json({ message: "검사 일정 저장 실패" });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "제품이 존재하지 않습니다." });
        }

        res.json({ message: "검사 일정 저장 완료" });
    });
});




    router.get('/products/:id', (req, res) => {
        const productId = Number(req.params.id);
    
        if (!Number.isSafeInteger(productId) || productId <= 0) {
            return res.status(400).json({
                message: '올바른 제품 ID가 필요합니다.'
            });
        }
    
        const sql = `
            SELECT
                p.product_id,
                p.product_code,
                p.product_name,
                p.product_type,
                p.company,
                p.price,
                p.stock,
                p.image_url,
                p.variant_text,
                DATE_FORMAT(p.next_inspection_date, '%Y-%m-%d') AS next_inspection_date,
                COALESCE(i.quality_status, '미실시') AS quality_status,
                DATE_FORMAT(i.created_at, '%Y-%m-%d / %H:%i:%s') AS created_at,
                i.inspector,
                i.memo
            FROM quality_products p
            LEFT JOIN quality_inspections i
                ON i.inspection_id = (
                    SELECT i2.inspection_id
                    FROM quality_inspections i2
                    WHERE i2.product_id = p.product_id
                    ORDER BY
                        i2.created_at DESC,
                        i2.inspection_id DESC
                    LIMIT 1
                )
            WHERE p.product_id = ?
        `;
    
        db.query(sql, [productId], (err, rows) => {
            if (err) {
                console.error('제품 상세 조회 실패:', err);
    
                return res.status(500).json({
                    message: '제품 상세 조회 실패'
                });
            }
    
            if (rows.length === 0) {
                return res.status(404).json({
                    message: '제품을 찾을 수 없습니다.'
                });
            }
    
            return res.json(rows[0]);
        });
    });

    router.delete('/products/:id', (req,res) => {
        const productId = Number(req.params.id);

        const sql = `
            DELETE FROM quality_products
            WHERE product_id = ?
        `;

        db.query(sql, [productId], (err, rows) => {
            if(err){
                console.error("삭제 실패")
                return res.status(500).json({
                    message: "삭제오류"
                })
        }
            return res.json(rows);
        })

        
    })

    router.delete('/inspections/:id', (req, res) => {
        const inspection_id = Number(req.params.id);

        const sql = `
            DELETE from quality_inspections
            WHERE inspection_id = ?
        `;

        db.query(sql,[inspection_id], (err, rows) => {
            if(err){
                console.error("검사리스트 삭제 실패")
                return res.status(500).json({
                    message : "삭제오류"
                })
            }
                    return res.json(rows);
        })
    })

    


    router.get('/products/:id/inspections', (req, res) => {
        const productId = Number(req.params.id);
    
        if (!Number.isSafeInteger(productId) || productId <= 0) {
            return res.status(400).json({
                message: "올바른 제품 ID가 필요합니다."

                
            });
        }
    
        const sql = `
            SELECT
                inspection_id,
                product_id,
                DATE_FORMAT(created_at, '%Y-%m-%d / %H:%i:%s') AS created_at,
                inspector,
                quality_status,
                fail_reason,
                memo,
                quality_score
            FROM quality_inspections
            WHERE product_id = ?
            ORDER BY created_at DESC, inspection_id DESC
        `;
    
        db.query(sql, [productId], (err, rows) => {
            if (err) {
                console.error("검사 이력 조회 실패:", err);
                return res.status(500).json({
                    message: "검사 이력을 불러올 수 없습니다."
                });
            }
    
            return res.json(rows);
        });
    });



    router.get('/inspections/:id/items', (req, res) => {

        const inspectionId = Number(req.params.id);
    
        const sql = `
            SELECT *
            FROM quality_inspection_items
            WHERE inspection_id = ?
            ORDER BY item_id
        `;
    
        db.query(sql, [inspectionId], (err, rows) => {
    
            if (err) {
                console.error("체크리스트 조회 실패:", err);
                return res.status(500).json({
                    message: "체크리스트 조회 실패"
                });
            }
    
            res.json(rows);
        });
    });
    
    
    
module.exports = router;