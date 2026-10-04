UPDATE public.profiles SET iam_role = 'owner', updated_at = now()
WHERE id IN ('bcd298ed-3901-4fac-97b9-609a78335862', '67cb8622-52c7-4517-8552-8b57d28577c7');

INSERT INTO public.audit_logs_iam (event_type, actor_user_id, target_user_id, action, previous_value, new_value)
VALUES 
('IAM', NULL, 'bcd298ed-3901-4fac-97b9-609a78335862', 'role_assignment', '{"iam_role":"user"}', '{"iam_role":"owner"}'),
('IAM', NULL, '67cb8622-52c7-4517-8552-8b57d28577c7', 'role_assignment', '{"iam_role":"user"}', '{"iam_role":"owner"}');