import React, { useState, useEffect } from "react";
import { Button } from "react-bootstrap";
import Modal from "react-modal";

const modalStyle = {
    content: {
        display: 'inline-block',
        width: 'fit-content',
        height: 'fit-content',
        margin: 'auto',
        backgroundColor: '#6c95d2ff', // light blue/gray
        borderRadius: '8px',
        padding: '24px',
        textAlign: 'center',
        boxSizing: 'border-box',
    },
};

const YesNoModal = ({ message, onYes, onNo, open }: any) => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        setIsOpen(!!open);
    }, [open]);

    const handleYes = () => {
        setIsOpen(false);
        onYes();
    };

    const handleNo = () => {
        setIsOpen(false);
        onNo();
    };

    return (
        <Modal isOpen={isOpen} onRequestClose={() => setIsOpen(false)} style={modalStyle}>
            <div>
                <div style={{ marginBottom: '20px' }}>{message}</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
                    <Button variant="primary" onClick={handleYes}>Yes</Button>
                    <Button variant="warning" onClick={handleNo}>No</Button>
                </div>
            </div>
        </Modal>
    );
};

export default YesNoModal;
