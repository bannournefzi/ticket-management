-- Reset existing USER permissions to new defaults
-- PostgreSQL syntax

-- Revoke ASSISTANT_DEPANNAGE and BASE_CONNAISSANCES for all ROLE_USER users
UPDATE user_page_permissions upp
SET granted = false
FROM user_roles ur
JOIN roles r ON r.id = ur.roles_id
WHERE upp.user_id = ur.user_id
  AND r.name = 'ROLE_USER'
  AND upp.page_key IN ('ASSISTANT_DEPANNAGE', 'BASE_CONNAISSANCES');

-- Grant all 8 default pages for ROLE_USER users
UPDATE user_page_permissions upp
SET granted = true
FROM user_roles ur
JOIN roles r ON r.id = ur.roles_id
WHERE upp.user_id = ur.user_id
  AND r.name = 'ROLE_USER'
  AND upp.page_key IN ('DASHBOARD','CREER_TICKET','MES_TICKETS',
                       'CALENDRIER_SLA','MESSAGES','CALENDRIER_REUNIONS',
                       'REUNIONS','MON_PROFIL');
