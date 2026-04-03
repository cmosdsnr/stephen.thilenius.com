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

    if (loaded)
        return <input type="file" accept=".json" onChange={handleFileUpload} />
    else
        return (
            <>
                <p>File loaded: {fileName}</p>
                <button onClick={() => setLoaded(false)}>Load another file</button>
            </>
        )
};
