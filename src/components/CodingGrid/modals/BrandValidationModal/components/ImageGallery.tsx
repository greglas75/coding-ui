import { Image as ImageIcon } from 'lucide-react';
import type { MultiSourceValidationResult } from '../../../../../services/multiSourceValidator';

interface ImageGalleryProps {
  result: MultiSourceValidationResult;
  userResponse: string;
  categoryName: string;
}

export function ImageGallery({ result, userResponse, categoryName }: ImageGalleryProps) {
  if (!result.image_urls || result.image_urls.length === 0) {
    return null;
  }

  const midpoint = Math.ceil(result.image_urls.length / 2);
  const searchAImages = result.image_urls.slice(0, midpoint);
  const searchBImages = result.image_urls.slice(midpoint);
  const searchQueryA = userResponse;
  const searchQueryB = `${userResponse} ${categoryName}`;

  return (
    <div>
      <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
        <ImageIcon className="h-5 w-5 text-blue-600" />
        Image Gallery ({result.image_urls.length} images from Google Images)
      </h3>
      <div className="grid grid-cols-2 gap-6">
        {/* Search A Column */}
        <div>
          <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
            <span className="bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">Search A:</span>
            <span className="text-gray-700 dark:text-gray-300">{searchQueryA}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {searchAImages.map((img, idx) => (
              <div
                key={idx}
                className="bg-gray-50 dark:bg-gray-800/50 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
              >
                <a
                  href={img.context_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <img
                    src={img.thumbnail_url || img.url}
                    alt={img.title}
                    className="w-full h-32 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3ENo Image%3C/text%3E%3C/svg%3E';
                    }}
                  />
                  <div className="p-2">
                    <div className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2 font-medium">
                      {img.title}
                    </div>
                    {img.snippet && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-1">
                        {img.snippet}
                      </div>
                    )}
                  </div>
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Search B Column */}
        <div>
          <div className="text-sm font-semibold text-green-600 dark:text-green-400 mb-3 flex items-center gap-2">
            <span className="bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">Search B:</span>
            <span className="text-gray-700 dark:text-gray-300">{searchQueryB}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {searchBImages.map((img, idx) => (
              <div
                key={idx}
                className="bg-gray-50 dark:bg-gray-800/50 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
              >
                <a
                  href={img.context_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <img
                    src={img.thumbnail_url || img.url}
                    alt={img.title}
                    className="w-full h-32 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3ENo Image%3C/text%3E%3C/svg%3E';
                    }}
                  />
                  <div className="p-2">
                    <div className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2 font-medium">
                      {img.title}
                    </div>
                    {img.snippet && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-1">
                        {img.snippet}
                      </div>
                    )}
                  </div>
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

