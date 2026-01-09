-- Create the advice table
CREATE TABLE IF NOT EXISTS advice (
    advice_id TEXT PRIMARY KEY,
    contract_type TEXT NOT NULL,
    section TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index for faster searching
CREATE INDEX IF NOT EXISTS idx_advice_contract_type ON advice(contract_type);
CREATE INDEX IF NOT EXISTS idx_advice_search ON advice USING GIN(to_tsvector('english', title || ' ' || content));

-- Enable Row Level Security (RLS)
ALTER TABLE advice ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows everyone to read advice
CREATE POLICY "Allow public read access" ON advice
    FOR SELECT USING (true);

-- Create a policy that allows only service role to insert/update (optional, but good practice)
-- Note: By default, if no policy exists for INSERT/UPDATE, only service role can do it anyway.
