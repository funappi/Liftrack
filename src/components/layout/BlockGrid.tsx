import React from 'react';
import { LayoutTab, useBlockLayout } from '../../utils/layout';

interface BlockGridProps {
  tab: LayoutTab;
  /** Content of each block, keyed by the ids of LAYOUT_BLOCKS[tab]; null/false blocks are skipped */
  blocks: Record<string, React.ReactNode>;
}

// Renders the blocks of a screen in the user's order: full width, or half width on the left/right column
export const BlockGrid: React.FC<BlockGridProps> = ({ tab, blocks }) => {
  const layout = useBlockLayout(tab);
  return (
    <div className="grid grid-cols-2 grid-flow-row-dense gap-x-3 gap-y-7 items-start">
      {layout.map(({ id, width }) => {
        const content = blocks[id];
        if (!content) return null;
        const placement = width === 'wide' ? 'col-span-2' : width === 'left' ? 'col-start-1 col-span-1' : 'col-start-2 col-span-1';
        return (
          <div key={id} data-block={id} className={`${placement} min-w-0`}>
            {content}
          </div>
        );
      })}
    </div>
  );
};
