import { CheckSquare, Square } from 'lucide-react';
import { memo, type FC } from 'react';

interface SelectionCellProps {
  answerId: number;
  isSelected: boolean;
  onToggle: (id: string, event: React.MouseEvent) => void;
}

const SelectionCellComponent: FC<SelectionCellProps> = ({
  answerId,
  isSelected,
  onToggle
}) => {
  return (
    <div className="flex items-center justify-center">
      {isSelected ? (
        <CheckSquare
          size={18}
          className="text-blue-600 dark:text-blue-400 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation(); // Prevent row click
            onToggle(String(answerId), e);
          }}
        />
      ) : (
        <Square
          size={18}
          className="text-gray-400 dark:text-gray-500 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation(); // Prevent row click
            onToggle(String(answerId), e);
          }}
        />
      )}
    </div>
  );
};

export const SelectionCell = memo(SelectionCellComponent);
