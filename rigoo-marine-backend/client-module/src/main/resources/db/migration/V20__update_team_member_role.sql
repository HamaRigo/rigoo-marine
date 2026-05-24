-- Update the most recently added team member's role to 'Software Engineer'
UPDATE team_members
SET role = 'Software Engineer',
    role_ar = 'مهندس برمجيات',
    updated_at = NOW()
WHERE id = (SELECT id FROM team_members ORDER BY created_at DESC LIMIT 1);
