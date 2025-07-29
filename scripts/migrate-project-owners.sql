-- Migration script to add project creators as owner members
-- This fixes the issue where projects created before the member system 
-- don't appear in the sidebar or allow member management

-- First, let's see what we're working with
SELECT 
    p.id as project_id,
    p.name as project_name,
    p."userId" as creator_id,
    pm.id as member_id,
    pm.role as member_role
FROM projects p
LEFT JOIN project_members pm ON p.id = pm."projectId" AND p."userId" = pm."userId"
WHERE pm.id IS NULL; -- Projects without creator membership

-- Add missing creator memberships
INSERT INTO project_members ("projectId", "userId", role, "joinedAt", "createdAt")
SELECT 
    p.id,
    p."userId",
    'owner',
    NOW(),
    NOW()
FROM projects p
LEFT JOIN project_members pm ON p.id = pm."projectId" AND p."userId" = pm."userId"
WHERE pm.id IS NULL; -- Only projects without creator membership

-- Verify the migration
SELECT 
    p.id as project_id,
    p.name as project_name,
    p."userId" as creator_id,
    pm.id as member_id,
    pm.role as member_role
FROM projects p
LEFT JOIN project_members pm ON p.id = pm."projectId" AND p."userId" = pm."userId"
ORDER BY p."createdAt" DESC;
