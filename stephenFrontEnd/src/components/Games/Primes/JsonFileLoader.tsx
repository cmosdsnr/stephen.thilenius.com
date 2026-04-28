import React, { useState } from 'react';

interface JsonFileLoaderProps {
    onLoad: (data: any) => void;
}

export const JsonFileLoader: React.FC<JsonFileLoaderProps> = ({ onLoad }) => {
    const [loaded, setLoaded] = useState(false);
    const [fileName, setFileName] = useState("");

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                onLoad(json);
                setLoaded(true);
                // console.log("Loaded JSON:", json);
            } catch (err) {
                console.error("Invalid JSON file:", err);
            }
        };
        reader.readAsText(file);
    };

    if (!loaded)
        return <input type="file" accept=".json" onChange={handleFileUpload} />
    else
        return (
            <>
                <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: '0.78rem', color: '#166534' }}>
                    ✓ {fileName}
                </span>
                {' '}
                <button
                    onClick={() => setLoaded(false)}
                    style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'transparent', border: '1px solid #6a9ac4', borderRadius: 3, padding: '2px 8px', cursor: 'pointer', color: '#6a9ac4' }}
                >
                    Load another
                </button>
            </>
        )
};
