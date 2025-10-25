-- Add vision_model column to categories table for visual analysis of images
-- This allows using a separate (cheaper) model for image analysis

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'vision_model'
    ) THEN
        ALTER TABLE categories ADD COLUMN vision_model TEXT DEFAULT 'gemini-2.5-flash-lite';
        RAISE NOTICE '✅ Added column: vision_model (default: gemini-2.5-flash-lite)';
    ELSE
        RAISE NOTICE '⚠️ Column already exists: vision_model';
    END IF;
END $$;

-- Update existing categories to use Gemini 2.5 Flash Lite for vision
UPDATE categories
SET vision_model = 'gemini-2.5-flash-lite'
WHERE vision_model IS NULL;

COMMENT ON COLUMN categories.vision_model IS 'AI model used for visual analysis of Google Images (e.g., logo detection, product recognition)';
