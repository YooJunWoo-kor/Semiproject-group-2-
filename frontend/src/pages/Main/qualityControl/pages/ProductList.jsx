import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import ModalBase from "../../../../components/ModalBase";
import { API_BASE_URL } from "../../../../utils/authStorage";
import "./QualityControl.css";

const emptyForm = {
    productCode: "",
    productName: "",
    company: "",
    price: "",
    stock: "",
    variantText: ""
};

function ProductList() {
    const navigate = useNavigate();
    const [search, setSearch] = useState("");
    const [products, setProducts] = useState([]);
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);
    const [productForm, setProductForm] = useState(emptyForm);
    const [imageFile, setImageFile] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        const loadProducts = async () => {
            try {
                const response = await axios.get(API_BASE_URL + "/quality/products");
                setProducts(response.data);
            } catch (error) {
                console.error("제품 목록 조회 오류:", error);
            }
        };

        loadProducts();
    }, [refreshKey]);

    const filteredProducts = products.filter(product =>
        (product.product_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (product.product_code || "").toLowerCase().includes(search.toLowerCase())
    );

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setProductForm(prev => ({ ...prev, [name]: value }));
    };

    const handleProductSubmit = async (e) => {
        e.preventDefault();
        if (isSaving) return;

        const formData = new FormData();
        Object.entries(productForm).forEach(([key, value]) => formData.append(key, value));
        if (imageFile) formData.append("image", imageFile);

        setIsSaving(true);

        try {
            await axios.post(API_BASE_URL + "/quality/products", formData);
            alert("제품등록이 완료되었습니다.");
            setProductForm(emptyForm);
            setImageFile(null);
            setIsRegisterOpen(false);
            setRefreshKey(prev => prev + 1);
        } catch (error) {
            alert(error.response?.data?.message || "제품등록에 실패했습니다.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="quality-products-page">
            <header className="dashboard-header quality-page-header">
                <div>
                    <span className="quality-eyebrow">PRODUCTS</span>
                    <h1>제품 목록</h1>
                    <p>등록된 제품의 기본정보와 재고 현황을 확인합니다.</p>
                </div>
                <div className="quality-header-badge">{filteredProducts.length}개 제품</div>
                <div className="dashboard-top">
                    <button type="button" className="register-btn" onClick={() => setIsRegisterOpen(true)}>
                        + 제품등록
                    </button>
                </div>
            </header>

            <section className="quality-toolbar">
                <div className="quality-toolbar-copy">
                    <strong>제품 검색</strong>
                    <span>제품명이나 제품코드로 검색하세요.</span>
                </div>
                <div className="quality-search-box">
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="제품명 또는 제품코드 검색" aria-label="제품 검색" />
                </div>
            </section>

            {filteredProducts.length === 0 ? (
                <div className="quality-empty-state quality-empty-card">검색 조건에 맞는 제품이 없습니다.</div>
            ) : (
                <div className="quality-product-grid">
                    {filteredProducts.map(product => (
                        <article key={product.product_id} className="quality-product-card"
                            onClick={() => navigate("/main/qa/products/" + product.product_id)}>
                            <div className="quality-product-image">
                                {product.image_url ? (
                                    <img src={product.image_url} alt={product.product_name} />
                                ) : (
                                    <span className="quality-image-placeholder">이미지 없음</span>
                                )}
                                <span className={
                                    "quality-status " +
                                    (product.quality_status === "통과" ? "is-pass" :
                                        product.quality_status === "불합격" ? "is-fail" : "is-wait")
                                }>
                                    {product.quality_status || "미실시"}
                                </span>
                            </div>
                            <div className="quality-product-info">
                                <div className="quality-product-heading">
                                    <div>
                                        <span className="quality-product-code">{product.product_code}</span>
                                        <h3>{product.product_name}</h3>
                                    </div>
                                    <span className="quality-product-variant">{product.variant_text}</span>
                                </div>
                                <p className="quality-product-price">
                                    ₩ {Number(product.price || 0).toLocaleString()}
                                </p>
                                <div className="quality-product-meta">
                                    <span>재고 <strong>{product.stock}개</strong></span>
                                    <span>{product.company}</span>
                                </div>
                                <div className="quality-product-action">상세 정보 보기 <span aria-hidden="true">→</span></div>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            {isRegisterOpen && (
                <ModalBase title="제품등록" onClose={() => setIsRegisterOpen(false)}
                    layout={
                        <form className="draft-box" onSubmit={handleProductSubmit}>
                            <div className="draft-row">
                                <label>제품코드 *
                                    <input name="productCode" value={productForm.productCode}
                                        onChange={handleInputChange} placeholder="COS-004" required />
                                </label>
                                <label>제품명 *
                                    <input name="productName" value={productForm.productName}
                                        onChange={handleInputChange} required />
                                </label>
                            </div>
                            <label>제조사
                                <input name="company" value={productForm.company}
                                    onChange={handleInputChange} />
                            </label>
                            <div className="draft-row">
                                <label>가격 *
                                    <input type="number" name="price" min="0" step="1"
                                        value={productForm.price} onChange={handleInputChange} required />
                                </label>
                                <label>재고 *
                                    <input type="number" name="stock" min="0" step="1"
                                        value={productForm.stock} onChange={handleInputChange} required />
                                </label>
                            </div>
                            <label>제품 옵션
                                <input name="variantText" value={productForm.variantText}
                                    onChange={handleInputChange} placeholder="예: 50ml, 100ml" />
                            </label>
                            <label>제품 이미지 (JPG, PNG, WEBP · 5MB 이하)
                                <input type="file" accept=".jpg,.jpeg,.png,.webp"
                                    onChange={e => setImageFile(e.target.files[0] || null)} />
                            </label>
                            <div className="draft-actions">
                                <button type="submit" className="erp-primary-button" disabled={isSaving}>
                                    {isSaving ? "등록 중..." : "제품등록"}
                                </button>
                            </div>
                        </form>
                    }
                />
            )}
        </div>
    );
}

export default ProductList;
