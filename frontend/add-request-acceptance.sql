-- Run in Supabase SQL Editor to add driver acceptance to ride requests

ALTER TABLE ride_requests
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined')),
  ADD COLUMN IF NOT EXISTS accepted_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Allow verified drivers to accept / decline requests
DROP POLICY IF EXISTS "Drivers can update ride requests" ON ride_requests;
CREATE POLICY "Drivers can update ride requests" ON ride_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.user_type = 'driver'
        AND p.id_verified = true
        AND p.driver_history_checked = true
    )
  );
