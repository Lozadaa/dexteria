import React from 'react';
import { TaskRunner } from './Runner';

export const BottomPanel: React.FC = () => {
    return (
        <div className="h-full w-full overflow-hidden">
            <TaskRunner />
        </div>
    );
};
