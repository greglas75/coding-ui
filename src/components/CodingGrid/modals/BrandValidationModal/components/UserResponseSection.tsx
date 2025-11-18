interface UserResponseSectionProps {
  userResponse: string;
  translation?: string;
}

export function UserResponseSection({ userResponse, translation }: UserResponseSectionProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Left Column: User Response */}
      <div>
        <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">
          User Response
        </h3>
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-lg text-gray-900 dark:text-gray-100 font-medium">{userResponse}</p>
        </div>
      </div>

      {/* Right Column: Translation */}
      <div>
        <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Translation
        </h3>
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-lg text-gray-900 dark:text-gray-100 font-medium">
            {translation && translation !== userResponse ? translation : '—'}
          </p>
        </div>
      </div>
    </div>
  );
}

