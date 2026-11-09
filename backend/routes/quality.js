const express = require('express');
const router = express.Router();
const db = require('../db');

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
        DATE_FORMAT(i.inspection_date, '%Y-%m-%d') AS inspection_date,
        i.inspector,
        i.memo
    FROM quality_products p
    LEFT JOIN quality_inspections i
        ON i.inspection_id = (
            SELECT i2.inspection_id
            FROM quality_inspections i2
            WHERE i2.product_id = p.product_id
            ORDER BY i2.inspection_date DESC, i2.inspection_id DESC
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
 
    
router.post('/inspections', (req, res) => {

    const {
        productId, inspectionDate, inspector,
        qualityStatus, failReason, memo,
        qualityScore, checklist
    } = req.body;

    if (!productId || !inspectionDate || !inspector || !Array.isArray(checklist) || !checklist.length) {
        return res.status(400).json({ message: "필수 정보가 없습니다." });
    }

    // 1. 품질검사 정보 저장
    const sql = `
        INSERT INTO quality_inspections
        (product_id, inspection_date, inspector, quality_status,
         fail_reason, memo, quality_score)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
        productId, inspectionDate, inspector, qualityStatus,
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

        const itemSql = `
            INSERT INTO quality_inspection_items
            (inspection_id, item_name, description, result, is_custom)
            VALUES ?
        `;

        db.query(itemSql, [items], (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "체크리스트 저장 실패" });
            }

            res.status(201).json({ message: "저장 완료" });
        });
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
                COALESCE(i.quality_status, '미실시') AS quality_status,
                DATE_FORMAT(i.inspection_date, '%Y-%m-%d') AS inspection_date,
                i.inspector,
                i.memo
            FROM quality_products p
            LEFT JOIN quality_inspections i
                ON i.inspection_id = (
                    SELECT i2.inspection_id
                    FROM quality_inspections i2
                    WHERE i2.product_id = p.product_id
                    ORDER BY
                        i2.inspection_date DESC,
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
                DATE_FORMAT(inspection_date, '%Y-%m-%d') AS inspection_date,
                inspector,
                quality_status,
                fail_reason,
                memo,
                quality_score
            FROM quality_inspections
            WHERE product_id = ?
            ORDER BY inspection_date DESC, inspection_id DESC
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