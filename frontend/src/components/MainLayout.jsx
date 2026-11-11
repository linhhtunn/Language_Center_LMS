import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useTest } from '../context/TestContext';
import ChatbotWidget from './chatbot/ChatbotWidget';

const MainLayout = () => {
    const { isTestActive } = useTest();

    return (
        <div className="container-fluid vh-100 bg-light p-0">
            <div className="row g-0 h-100">
                {/* Sidebar cố định bên trái */}
                {!isTestActive && <Sidebar />}

                {/* Nội dung thay đổi (Outlet) bên phải */}
                <div className={`${isTestActive ? 'col-12' : 'col-md-9 col-lg-10'} p-4 overflow-auto h-100`}>
                    <Outlet />
                </div>
            </div>
            <ChatbotWidget />
        </div>
    );
};

export default MainLayout;
