import { useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import crmDummy from './data/crmDummy.json';
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

  return (
    <Routes>
      <Route path="" element={<CrmHome data={data} setData={setData} />} />
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
    </Routes>
  );
}
