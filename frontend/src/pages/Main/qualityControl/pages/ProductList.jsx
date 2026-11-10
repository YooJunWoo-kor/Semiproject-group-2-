import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../../../../utils/authStorage";
import "./QualityControl.css";
import ModalBase from "../../../../components/ModalBase";

function ProductList() {
    const navigate = useNavigate();
    const [search, setSearch] = useState("");
    const [products, setProducts] = useState([]);
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);

    const [productForm, setProductForm] = useState({
        productCode: "",
        productName: "",
        productType: "",
        company: "",
        price: "",
        stock: "",
        variantText: ""
    });

    const [imageFile, setImageFile] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        async function loadProducts() {
            try{
                const response = await axios.get(`${API_BASE_URL}/quality/products`);

                console.log("DB 제품 목록", response.data);

                const productList = response.data.map(product => ({
                    id: product.product_id,
                    code: product.product_code,
                    name: product.product_name,
                    type: product.product_type,
                    company: product.company,

                    price: product.price,
                    stock: product.stock,

                    image: product.image_url,
                    variantText: product.variant_text,

                    qualityStatus: product.quality_status,
                    inspectionDate: product.inspection_date || "-",
                    memo: product.memo || ""
                }));

                setProducts(productList);
            }catch (error){
                console.error("제품 목록 조회 실패:", error);
            }
        }

        loadProducts();
    }, [])

    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.code.toLowerCase().includes(search.toLowerCase())
    );

    const handleInputChange = (e) => {
        const {name, value} = e.target;

        setProductForm(prev => ({
            ...prev,
            [name] : value
        }));
    }

    const handleImageChange = (e) => {
        const file = e.target.file[0];
        setImageFile(file || null);
    }

    
    const handleProductSubmit = async (e) => {
        e.preventDefault();

        if (isSaving) return;

        setIsSaving(true);

        try {
            // 제품 정보를 파일과 함께 전송하기 위한 객체
            const formData = new FormData();

            Object.entries(productForm).forEach(([key, value]) => {
                formData.append(key, value); // 데이터 담기
            });

            // 이미지 파일을 선택했을 때만 추가
            if (imageFile) {
                formData.append("image", imageFile);
            }

            // 백엔드 제품등록 API 요청
            await axios.post( `${API_BASE_URL}/quality/products`, formData );

            alert("제품등록이 완료되었습니다.");

            // 입력 폼 초기화
            setProductForm({
                productCode: "",
                productName: "",
                productType: "",
                company: "",
                price: "",
                stock: "",
                variantText: ""
            });

            setImageFile(null);
            setIsRegisterOpen(false);

            // 제품 목록 새로고침
            setRefreshKey(prev => prev + 1);

        } catch (error) {
            console.error("제품등록 실패:", error);

            alert(
                error.response?.data?.message ||
                "제품등록에 실패했습니다."
            );

        } finally {
            setIsSaving(false);
        }
    };


    return (
        <div className="quality-products-page">
            <header className="quality-page-header">
                <div>
                    <span className="quality-eyebrow">PRODUCTS</span>
                    <h1>제품 목록</h1>
                    <p>등록된 제품의 기본정보와 재고 현황을 확인합니다.</p>
                </div>
                <div className="quality-header-badge">{filteredProducts.length}개 제품</div>

                <button type="button" onClick={() => setIsRegisterOpen(true)}>제품등록</button>
            </header>

            <section className="quality-toolbar">
                <div className="quality-toolbar-copy">
                    <strong>제품 검색</strong>
                    <span>제품명 또는 제품코드로 빠르게 찾을 수 있습니다.</span>
                </div>
                <div className="quality-search-box">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="제품명 또는 제품코드 검색"
                    />
                </div>
            </section>

            {filteredProducts.length === 0 ? (
                <div className="quality-empty-state quality-empty-card">
                    검색 조건에 맞는 제품이 없습니다.
                </div>
            ) : (
                <div className="quality-product-grid">
                    {filteredProducts.map(product => (
                        <article
                            className="quality-product-card"
                            key={product.id}
                            onClick={() => navigate(`/main/qa/products/${product.id}`)}
                        >
                            <div className="quality-product-image">
                                <img src={product.image} alt={product.name} />
                                <span className={
                                    product.qualityStatus === "통과"
                                        ? "quality-status is-pass"
                                        : product.qualityStatus === "불합격"
                                        ? "quality-status is-fail"
                                        : "quality-status is-wait"
                                }>
                                    {product.qualityStatus}
                                </span>
                            </div>

                            <div className="quality-product-info">
                                <div className="quality-product-heading">
                                    <div>
                                        <span className="quality-product-code">{product.code}</span>
                                        <h3>{product.name}</h3>
                                    </div>
                                    <span className="quality-product-variant">{product.variantText}</span>
                                </div>

                                <p className="quality-product-price">
                                    ₩ {product.price.toLocaleString()}
                                </p>

                                <div className="quality-product-meta">
                                    <span>재고 <strong>{product.stock}개</strong></span>
                                    <span>{product.company}</span>
                                </div>

                                <div className="quality-product-action">
                                    상세 정보 보기
                                    <span aria-hidden="true">→</span>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            {isRegisterOpen && (
                <ModalBase title="제품등록" onClose={() => setIsRegisterOpen(false)}
                    layout={
                        <div>
                            <form onSubmit={(e) => {
                                e.preventDefault();
                                alert("입력 확인 완료! DB 저장은 다음 단계에 연결합니다");
                            }}>
                                <div>
                                    <label>제품코드 *</label>
                                    <input type="text" name="productCode" value={productForm.productCode} onChange={handleInputChange}
                                    placeholder="COS-004"/>
                                </div>

                                <div>
                                    <label>제품명 *</label>
                                    <input
                                        type="text"
                                        name="productName"
                                        value={productForm.productName}
                                        onChange={handleInputChange}
                                        required // 폼 제출 전 필수입력 명령어
                                    />
                                </div>

                                <div>
                                    <label>제품 종류</label>
                                    <input
                                        type="text"
                                        name="productType"
                                        value={productForm.productType}
                                        onChange={handleInputChange}
                                        placeholder="화장품"
                                    />
                                </div>

                                <div>
                                    <label>제조사</label>
                                    <input
                                        type="text"
                                        name="company"
                                        value={productForm.company}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div>
                                    <label>가격 *</label>
                                    <input
                                        type="number"
                                        name="price"
                                        min="0"
                                        step="1"
                                        value={productForm.price}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>

                                <div>
                                    <label>재고 *</label>
                                    <input
                                        type="number"
                                        name="stock"
                                        min="0"
                                        step="1"
                                        value={productForm.stock}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>

                                <div>
                                    <label>제품 옵션</label>
                                    <input
                                        type="text"
                                        name="variantText"
                                        value={productForm.variantText}
                                        onChange={handleInputChange}
                                        placeholder="2 종류"
                                    />
                                </div>

                                <div>
                                <label>제품 이미지 URL</label>

                                <input type="file" accept="image/*" onChange={handleImageChange}/>

                                </div>

                                <button type="submit">
                                    제품등록
                                </button>

                            </form>
                        </div>
                    }
                />
            )}
        </div>
    );
}

export default ProductList;