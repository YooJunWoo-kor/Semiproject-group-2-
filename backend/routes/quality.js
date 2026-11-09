const express = require('express');
const router = express.Router();
const db = require('../db');

//제품 목록 조회
router.get('/products', (req,res) => {
    const sql = 
    `SELECT p.product_id, p.product_code, p.inspector, p.product_name, p.product_type, p.company, p.price, p.stock, p.image_url, p.variant_text,
     COALESCE(i.quality_status, '미실시') AS quality_status, 
    /* 검사 결과가 NULL이면 "미실시"로 표시 */
     DATE_FORMAT(i.inspection_date, '%Y-%m-%d') AS inspection_date,
     i.memo
     FROM quality_products p
     LEFT JOIN  quality_inspections i
    /* 아직 검사하지 않은 제품도 목록에 포함 */
        ON i.inspection_id = (
            SELECT i2.inspection_id
            FROM quality_inspections i2
            WHERE i2.product_id = p.product_id
            ORDER BY i2.inspection_date DESC, i2.inspection_id DESC
            LIMIT 1 
            /* 제품별 가장 최근 검사 결과 한 건만 선택 */
        ) 
     ORDER BY p.product_id`

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

    

    router.post('/inspections',(req, res) => {
        const {
            productId,
            inspectionDate,
            inspector,
            qualityStatus,
            failReason,
            memo,
            qualityScore
        } = req.body;

        const sql = `
            INSERT INTO quality_inspections
            (
                product_id,
                inspection_date,
                inspector,
                quality_status,
                fail_reason,
                memo,
                quality_score
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            
            `

        const values = [
            productId,
            inspectionDate,
            inspector,
            qualityStatus,
            failReason,
            memo,
            qualityScore
        ]
    
        db.query(sql, values, (err, result) => {
            if (err) {
                console.error("검사 정보 저장 실패:", err);
            
                return res.status(500).json({
                    message: "검사 정보를 저장할 수 없습니다"
                });
            }
    
            return res.status(201).json({
                message: '품질검사 등록 성공',
                inspectionId : result.insertId
            })
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
    

module.exports = router;