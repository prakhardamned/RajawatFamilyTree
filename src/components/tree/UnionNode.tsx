import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

interface UnionNodeProps {
  data: {
    label?: string;
  };
}

export const UnionNode = memo(({ data }: UnionNodeProps) => {
  return (
    <div
      title={data.label || 'Family Union'}
      className="relative w-7 h-7 rounded-full bg-amber-50 border-2 border-amber-300 flex items-center justify-center shadow-xs transition hover:scale-110"
    >
      {/* Target handle receiving parent connections */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!w-2 !h-2 !bg-amber-400 !border-1 !border-white"
      />

      <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />

      {/* Source handle distributing to children */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-2 !h-2 !bg-amber-500 !border-1 !border-white"
      />
    </div>
  );
});

UnionNode.displayName = 'UnionNode';
