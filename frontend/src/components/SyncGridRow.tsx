import React, { useState, useCallback } from 'react';

interface SyncGridRowProps {
    columns: number;
    className?: string;
    style?: React.CSSProperties;
    children: (syncProps: { 
        syncedHeights: { [key: number]: number }, 
        onRowHeightSync: (index: number, height: number, hasCheckbox: boolean) => void 
    }) => React.ReactNode;
}

export const SyncGridRow: React.FC<SyncGridRowProps> = ({ columns, className, style, children }) => {
    const [syncedHeights, setSyncedHeights] = useState<{ [key: number]: number }>({});
    
    const handleRowHeightSync = useCallback((index: number, height: number, hasCheckbox: boolean) => {
        if (columns < 2 || !hasCheckbox) return;
        setSyncedHeights(prev => {
            // We use a small threshold to avoid infinite update loops from sub-pixel differences
            if (prev[index] && Math.abs(prev[index] - height) < 1) return prev;
            if (prev[index] >= height) return prev;
            return { ...prev, [index]: height };
        });
    }, [columns]);

    return (
        <div 
            className={className}
            style={{ 
                ...style,
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` 
            }}
        >
            {children({ syncedHeights, onRowHeightSync: handleRowHeightSync })}
        </div>
    );
};
