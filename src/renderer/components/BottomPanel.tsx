import React from 'react';
import { LogViewer } from './LogViewer';

export const BottomPanel: React.FC = () => {
    return (
        <div className="h-full w-full bg-background/40 backdrop-blur-md overflow-hidden flex flex-col">
            <LogViewer />
        </div>
    );
};
