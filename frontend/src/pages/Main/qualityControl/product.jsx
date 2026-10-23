const products = [
    {
        id: 1,
        code: "COS-001",
        name: "수분크림",
        price: 25000,
        image: "/Images/수분크림.jpg",
        type: "화장품",
        company: "ABC Cosmetics",
        qualityStatus: "통과",
        stock: 120,
        variantText: "2 종류",
        inspectionDate: "2026-10-20",
        memo: "특이사항 없음"
    },
    {
        id: 2,
        code: "COS-002",
        name: "선크림",
        price: 18000,
        image: "/Images/선크림.jpg",
        type: "화장품",
        company: "ABC Cosmetics",
        qualityStatus: "불합격",
        stock: 80,
        variantText: "1 종류",
        inspectionDate: "2026-10-20",
        memo: "용기 외관 확인 필요"
    },
    {
        id: 3,
        code: "COS-003",
        name: "클렌징폼",
        price: 12000,
        image: "/Images/클렌징 폼.jpg",
        type: "화장품",
        company: "ABC Cosmetics",
        qualityStatus: "미실시",
        stock: 45,
        variantText: "3 종류",
        inspectionDate: "-",
        memo: ""
    }
];

export default products;