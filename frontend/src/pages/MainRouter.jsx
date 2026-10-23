<<<<<<< HEAD
import React from "react";
import Main from "./Main";
import QualityTestList from "./QualityTestList";
import { Routes, Route } from "react-router-dom";
import SelectBar from "./Selectbar";
import ProductList from "./ProductList";
import QualityTestGraph from "./QualityTestGraph";
import ProductDetail from "./ProductDetail";


function MainRouter() {
    return (
        <div className="app">

            <SelectBar />

            <main className="page-container">
                <Routes>
                    <Route path="/" element={<Main />} />

                    <Route path="/products" element={<ProductList />} />

                    <Route path="/TestList" element={<QualityTestList />} />

                    <Route path="/Graph" element={<QualityTestGraph />} />

                    <Route path="/products/:id" element={<ProductDetail />} />
                </Routes>
            </main>

        </div>
    )
}

export default MainRouter;
=======
import React from "react";
import Main from "./Main";
import QualityTestList from "./QualityTestList";
import { Routes, Route } from "react-router-dom";
import SelectBar from "./Selectbar";
import ProductList from "./ProductList";
import QualityTestGraph from "./QualityTestGraph";
import ProductDetail from "./ProductDetail";


function MainRouter() {
    return (
        <div className="app">

            <SelectBar />

            <main className="page-container">
                <Routes>
                    <Route path="/" element={<Main />} />

                    <Route path="/products" element={<ProductList />} />

                    <Route path="/TestList" element={<QualityTestList />} />

                    <Route path="/Graph" element={<QualityTestGraph />} />

                    <Route path="/products/:id" element={<ProductDetail />} />
                </Routes>
            </main>

        </div>
    )
}

export default MainRouter;
>>>>>>> dc756df83a6fb7de274b5334c8eba37dfa55c2f2
