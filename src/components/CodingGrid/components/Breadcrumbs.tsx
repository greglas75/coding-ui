import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

interface BreadcrumbsProps {
  categoryName: string;
}

export function Breadcrumbs({ categoryName }: BreadcrumbsProps) {
  return (
    <nav className="text-sm text-gray-500" aria-label="Breadcrumb">
      <Link to="/" className="hover:text-blue-600 inline-flex items-center gap-1">
        <Home size={14} />
        Categories
      </Link>
      <ChevronRight size={14} className="inline mx-1" />
      <span className="text-gray-700">{categoryName}</span>
      <ChevronRight size={14} className="inline mx-1" />
      <span className="text-blue-600 font-medium">Coding</span>
    </nav>
  );
}

