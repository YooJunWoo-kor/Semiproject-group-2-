import { useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import crmDummy from './data/crmDummy.json';
import Nav from '../../../components/Nav';
import CrmHome from './CrmHome';
import CustomersPage from './pages/CustomersPage';
import CustomerFormPage from './pages/CustomerFormPage';
import PartnersPage from './pages/PartnersPage';
import PartnerFormPage from './pages/PartnerFormPage';
import ConsultationsPage from './pages/ConsultationsPage';
import ConsultationFormPage from './pages/ConsultationFormPage';
import ClaimsPage from './pages/ClaimsPage';
import ClaimFormPage from './pages/ClaimFormPage';

const INITIAL_DATA = {
  customers: crmDummy.customers || [],
  partners: crmDummy.partners || [],
  purchases: crmDummy.purchases || [],
  consultations: crmDummy.consultations || [],
  claims: crmDummy.claims || [],
};

export default function CrmRoutes() {
  const [data, setData] = useState(INITIAL_DATA);
  const mainUrl = '/main/crm';

  // CRM 각 하위 페이지에서 계속 표시할 공통 메뉴입니다.
  const urlList = [
    { name: '대시보드', url: mainUrl },
    { name: '고객 관리', url: `${mainUrl}/customers` },
    { name: '거래처 관리', url: `${mainUrl}/partners` },
    { name: '상담 관리', url: `${mainUrl}/consultations` },
    { name: '클레임 관리', url: `${mainUrl}/claims` },
  ];

  // 왼쪽 메뉴와 현재 경로의 페이지를 한 레이아웃에 표시합니다.
  return (
    <div className="sub-main-contain">
      <Nav urlist={urlList} />
      <div className="sub-container">
        <Routes>
          <Route index element={<CrmHome data={data} setData={setData} />} />
          <Route path="customers" element={<CustomersPage data={data} setData={setData} />} />
          <Route path="customers/new" element={<CustomerFormPage data={data} setData={setData} />} />
          <Route
            path="customers/edit/:customerId"
            element={<CustomerFormPage data={data} setData={setData} />}
          />
          <Route path="partners" element={<PartnersPage data={data} setData={setData} />} />
          <Route path="partners/new" element={<PartnerFormPage data={data} setData={setData} />} />
          <Route
            path="partners/edit/:partnerId"
            element={<PartnerFormPage data={data} setData={setData} />}
          />
          <Route
            path="consultations"
            element={<ConsultationsPage data={data} setData={setData} />}
          />
          <Route
            path="consultations/new"
            element={<ConsultationFormPage data={data} setData={setData} />}
          />
          <Route
            path="consultations/edit/:consultationId"
            element={<ConsultationFormPage data={data} setData={setData} />}
          />
          <Route path="claims" element={<ClaimsPage data={data} setData={setData} />} />
          <Route path="claims/new" element={<ClaimFormPage data={data} setData={setData} />} />
          <Route
            path="claims/edit/:claimId"
            element={<ClaimFormPage data={data} setData={setData} />}
          />
          <Route path="*" element={<Navigate to={mainUrl} replace />} />
        </Routes>
      </div>
    </div>
  );
}