-- SQLite



-- Thêm dữ liệu mẫu vào bảng permissions
INSERT INTO permissions (name, description) VALUES
('view_users', 'Xem danh sách người dùng'),
('edit_users', 'Chỉnh sửa thông tin người dùng'),
('delete_users', 'Xóa người dùng'),
('view_files', 'Xem danh sách tệp'),
('edit_files', 'Chỉnh sửa tệp'),
('delete_files', 'Xóa tệp'),
('view_folders', 'Xem danh sách thư mục'),
('edit_folders', 'Chỉnh sửa thư mục'),
('delete_folders', 'Xóa thư mục');


-- Thêm dữ liệu mẫu vào bảng roles
INSERT INTO roles (name, description) VALUES
('Admin', 'Quản trị viên toàn quyền'),
('Editor', 'Người chỉnh sửa nội dung'),
('Viewer', 'Người chỉ có quyền xem');


-- Thêm dữ liệu mẫu vào bảng role_permissions
INSERT INTO role_permissions (role_id, permission_id) VALUES
(1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6), -- Admin có toàn bộ quyền
(2, 1), (2, 2), (2, 4), (2, 5), -- Editor có quyền xem, chỉnh sửa người dùng & file
(3, 1), (3, 4); -- Viewer chỉ có quyền xem người dùng và file


-- Thêm dữ liệu mẫu vào bảng users
INSERT INTO users (username, hashed_password, email, phone, address, full_name, role_id) VALUES
('admin', '$2b$12$c5EqMLJDaHGVJQGHveJnLO4ohckDVnNmYv0009wnxAV9Rqd1IuI4y', 'admin@example.com', '0123456789', '123 Admin St', 'Admin User', 1),
('editor', '$2b$12$c5EqMLJDaHGVJQGHveJnLO4ohckDVnNmYv0009wnxAV9Rqd1IuI4y', 'editor@example.com', '0987654321', '456 Editor St', 'Editor User', 2),
('viewer', '$2b$12$c5EqMLJDaHGVJQGHveJnLO4ohckDVnNmYv0009wnxAV9Rqd1IuI4y', 'viewer@example.com', '0112233445', '789 Viewer St', 'Viewer User', 3);


-- Thêm dữ liệu mẫu vào bảng folders
INSERT INTO folders (id, name, slug, parent_id) VALUES
(0, 'Root', 'root', NULL); -- Thư mục gốc với id = 0

INSERT INTO folders (name, slug, parent_id) VALUES
('Documents', 'documents', 0),
('Images', 'images', 0),
('Projects', 'projects', 0),
('Reports', 'reports', 1); -- "Reports" là thư mục con của "Documents"

-- Thêm dữ liệu mẫu vào bảng files
INSERT INTO files (name, slug, folder_id, filepath, file_size) VALUES
('Report 2025', 'report-2025', 4, '/uploads/reports/report-2025.pdf', 204800),
('Logo', 'logo', 2, '/uploads/images/logo.png', 51200),
('Project Plan', 'project-plan', 3, '/uploads/projects/plan.docx', 102400);


-- Thêm dữ liệu mẫu vào bảng resource_permissions
INSERT INTO resource_permissions (role_id, resource_type, resource_id, can_read, can_write, can_delete) VALUES
(1, 'files', 1, 1, 1, 1), -- Admin có toàn quyền với file ID 1
(2, 'files', 2, 1, 1, 0), -- Editor có quyền xem & chỉnh sửa file ID 2
(3, 'files', 3, 1, 0, 0); -- Viewer chỉ có quyền xem file ID 3


-- Các bản ghi cho nhóm "Hôm nay" (giả sử ngày hôm nay là 2025-02-17)
INSERT INTO chat_histories (name, slug, user_id, timestamp) VALUES ('Cuộc trò chuyện Today 1', 'cuoc-tro-chuyen-today-1' , 1, '2025-02-17 09:00:00');
INSERT INTO chat_histories (name, slug, user_id, timestamp) VALUES ('Cuộc trò chuyện Today 2', 'cuoc-tro-chuyen-today-2' , 1, '2025-02-17 10:00:00');
INSERT INTO chat_histories (name, slug, user_id, timestamp) VALUES ('Cuộc trò chuyện Today 3', 'cuoc-tro-chuyen-today-3' , 1, '2025-02-17 11:00:00');
INSERT INTO chat_histories (name, slug, user_id, timestamp) VALUES ('Cuộc trò chuyện Today 4', 'cuoc-tro-chuyen-today-4' , 1, '2025-02-17 12:00:00');
INSERT INTO chat_histories (name, slug, user_id, timestamp) VALUES ('Cuộc trò chuyện Today 5', 'cuoc-tro-chuyen-today-5' , 1, '2025-02-17 13:00:00');
INSERT INTO chat_histories (name, slug, user_id, timestamp) VALUES ('Cuộc trò chuyện Today 6', 'cuoc-tro-chuyen-today-6' , 1, '2025-02-17 14:00:00');
INSERT INTO chat_histories (name, slug, user_id, timestamp) VALUES ('Cuộc trò chuyện Today 7', 'cuoc-tro-chuyen-today-7' , 1, '2025-02-17 15:00:00');
INSERT INTO chat_histories (name, slug, user_id, timestamp) VALUES ('Cuộc trò chuyện Today 8', 'cuoc-tro-chuyen-today-8' , 1, '2025-02-17 16:00:00');

-- Các bản ghi cho nhóm "Hôm qua" (ngày 2025-02-16)
INSERT INTO chat_histories (name, slug, user_id, timestamp) VALUES ('Cuộc trò chuyện Yesterday 1', 'cuoc-tro-chuyen-yesterday-1' , 1, '2025-02-16 09:00:00');
INSERT INTO chat_histories (name, slug, user_id, timestamp) VALUES ('Cuộc trò chuyện Yesterday 2', 'cuoc-tro-chuyen-yesterday-2' , 1, '2025-02-16 10:00:00');
INSERT INTO chat_histories (name, slug, user_id, timestamp) VALUES ('Cuộc trò chuyện Yesterday 3', 'cuoc-tro-chuyen-yesterday-3' , 1, '2025-02-16 11:00:00');
INSERT INTO chat_histories (name, slug, user_id, timestamp) VALUES ('Cuộc trò chuyện Yesterday 4', 'cuoc-tro-chuyen-yesterday-4' , 1, '2025-02-16 12:00:00');
INSERT INTO chat_histories (name, slug, user_id, timestamp) VALUES ('Cuộc trò chuyện Yesterday 5', 'cuoc-tro-chuyen-yesterday-5' , 1, '2025-02-16 13:00:00');
INSERT INTO chat_histories (name, slug, user_id, timestamp) VALUES ('Cuộc trò chuyện Yesterday 6', 'cuoc-tro-chuyen-yesterday-6' , 1, '2025-02-16 14:00:00');
INSERT INTO chat_histories (name, slug, user_id, timestamp) VALUES ('Cuộc trò chuyện Yesterday 7', 'cuoc-tro-chuyen-yesterday-7' , 1, '2025-02-16 15:00:00');
INSERT INTO chat_histories (name, slug, user_id, timestamp) VALUES ('Cuộc trò chuyện Yesterday 8', 'cuoc-tro-chuyen-yesterday-8' , 1, '2025-02-16 16:00:00');
INSERT INTO chat_histories (name, slug, user_id, timestamp) VALUES ('Cuộc trò chuyện Yesterday 9', 'cuoc-tro-chuyen-yesterday-9' , 1, '2025-02-16 17:00:00');
INSERT INTO chat_histories (name, slug, user_id, timestamp) VALUES ('Cuộc trò chuyện Yesterday 10','cuoc-tro-chuyen-yesterday-10' , 1, '2025-02-16 18:00:00');
INSERT INTO chat_histories (name, slug, user_id, timestamp) VALUES ('Cuộc trò chuyện Yesterday 11','cuoc-tro-chuyen-yesterday-11' , 1, '2025-02-16 19:00:00');

-- Các bản ghi cho nhóm "7 ngày trước" (từ 2025-02-11 đến 2025-02-15)
INSERT INTO chat_histories (name, slug, user_id, timestamp) VALUES ('Cuộc trò chuyện 7DaysAgo 1','cuoc-tro-chuyen-7daysago-1' , 1, '2025-02-15 09:45:00');
INSERT INTO chat_histories (name, slug, user_id, timestamp) VALUES ('Cuộc trò chuyện 7DaysAgo 2','cuoc-tro-chuyen-7daysago-2' , 1, '2025-02-14 10:00:00');
INSERT INTO chat_histories (name, slug, user_id, timestamp) VALUES ('Cuộc trò chuyện 7DaysAgo 3','cuoc-tro-chuyen-7daysago-3' , 1, '2025-02-13 11:00:00');
INSERT INTO chat_histories (name, slug, user_id, timestamp) VALUES ('Cuộc trò chuyện 7DaysAgo 4','cuoc-tro-chuyen-7daysago-4' , 1, '2025-02-12 12:00:00');
INSERT INTO chat_histories (name, slug, user_id, timestamp) VALUES ('Cuộc trò chuyện 7DaysAgo 5','cuoc-tro-chuyen-7daysago-5' , 1, '2025-02-11 13:00:00');
-- For chat_history id = 1 (Hôm nay)'cuoc-tro-chuyen-yesterday-11' ,
INSERT INTO chat_messages (chat_history_id, question, answer, sources, timestamp) VALUES 
(1, 'Question 1 for ChatHistory 1', 
 'Answer: Our project is progressing well. We have encountered several challenges along the way, including technical constraints and resource limitations. However, we are actively addressing these issues by refining our approach and seeking additional expertise where necessary.', 
 'Internal Reports, Weekly Meeting', 
 '2025-02-17 09:05:00');

INSERT INTO chat_messages (chat_history_id, question, answer, sources, timestamp) VALUES 
(1, 'Question 2 for ChatHistory 1', 
 'Answer: Are there any blockers? Currently, we are facing some challenges with third-party integrations, which we are resolving by collaborating with our technical partners.', 
 'Team Sync, Slack', 
 '2025-02-17 09:10:00');

INSERT INTO chat_messages (chat_history_id, question, answer, sources, timestamp) VALUES 
(1, 'Question 3 for ChatHistory 1', 
 'Answer: What are the next steps? The next steps involve refining our approach and addressing outstanding issues by re-allocating resources and prioritizing tasks accordingly.', 
 'Project Plan, Email', 
 '2025-02-17 09:15:00');

INSERT INTO chat_messages (chat_history_id, question, answer, sources, timestamp) VALUES 
(1, 'Question 4 for ChatHistory 1', 
 'Answer: How are we measuring success? We are using various KPIs such as customer satisfaction, revenue growth, and operational efficiency. Detailed metrics and benchmarks have been established for continuous tracking.', 
 'KPI Dashboard, Report', 
 '2025-02-17 09:20:00');

INSERT INTO chat_messages (chat_history_id, question, answer, sources, timestamp) VALUES 
(1, 'Question 5 for ChatHistory 1', 
 'Answer: Can you provide a timeline for deliverables? The timeline is structured with several milestones, each with specific deliverables and deadlines, ensuring a methodical progression of the project.', 
 'Timeline, Meeting Notes', 
 '2025-02-17 09:25:00');

INSERT INTO chat_messages (chat_history_id, question, answer, sources, timestamp) VALUES 
(1, 'Question 6 for ChatHistory 1', 
 'Answer: Any updates on resource allocation? We have reviewed our resource allocation and made adjustments to ensure optimal productivity. Detailed plans have been outlined to address any shortfalls.', 
 'Resource Plan, HR Update', 
 '2025-02-17 09:30:00');

-----------------------------------------------------------
-- For chat_history id = 2 (Hôm nay)
INSERT INTO chat_messages (chat_history_id, question, answer, sources, timestamp) VALUES 
(2, 'Question 1 for ChatHistory 2', 
 'Answer: Detailed update on recent changes in the project. This update includes improvements, bug fixes, and new features that were carefully tested before release.', 
 'Dev Meeting, Changelog', 
 '2025-02-17 10:05:00');

INSERT INTO chat_messages (chat_history_id, question, answer, sources, timestamp) VALUES 
(2, 'Question 2 for ChatHistory 2', 
 'Answer: Analysis of the impact of the update on user experience and performance metrics. We have seen positive trends and are monitoring closely for any anomalies.', 
 'User Feedback, Analytics Report', 
 '2025-02-17 10:10:00');

INSERT INTO chat_messages (chat_history_id, question, answer, sources, timestamp) VALUES 
(2, 'Question 3 for ChatHistory 2', 
 'Answer: Discussion on bug fixes and technical challenges. Our technical team provided in-depth explanations regarding the fixes and steps taken to prevent recurrence.', 
 'Bug Tracker, Technical Report', 
 '2025-02-17 10:15:00');

INSERT INTO chat_messages (chat_history_id, question, answer, sources, timestamp) VALUES 
(2, 'Question 4 for ChatHistory 2', 
 'Answer: Insights into the new features and their benefits. The answer elaborates on the user experience improvements and backend optimizations introduced.', 
 'Feature Documentation, Meeting Notes', 
 '2025-02-17 10:20:00');

INSERT INTO chat_messages (chat_history_id, question, answer, sources, timestamp) VALUES 
(2, 'Question 5 for ChatHistory 2', 
 'Answer: Comprehensive explanation of performance improvements and testing methodologies. The answer provides a step-by-step overview of our QA processes and results.', 
 'Performance Reports, QA Team', 
 '2025-02-17 10:25:00');

INSERT INTO chat_messages (chat_history_id, question, answer, sources, timestamp) VALUES 
(2, 'Question 6 for ChatHistory 2', 
 'Answer: Summary of the implementation process and future considerations. Detailed insights into our next phase of development are also provided in this update.', 
 'Strategy Document, Internal Review', 
 '2025-02-17 10:30:00');

-----------------------------------------------------------
-- For chat_history id = 9 (Hôm qua)
INSERT INTO chat_messages (chat_history_id, question, answer, sources, timestamp) VALUES 
(9, 'Question 1 for ChatHistory 9', 
 'Answer: Detailed plan for the next quarter including expansion strategies and resource allocation. This answer explains our future direction in depth.', 
 'Quarterly Plan, Strategy Meeting', 
 '2025-02-16 17:05:00');

INSERT INTO chat_messages (chat_history_id, question, answer, sources, timestamp) VALUES 
(9, 'Question 2 for ChatHistory 9', 
 'Answer: Discussion on potential risks and challenges that may affect upcoming projects. The answer elaborates on mitigation strategies and contingency plans.', 
 'Risk Assessment, Meeting Notes', 
 '2025-02-16 17:10:00');

INSERT INTO chat_messages (chat_history_id, question, answer, sources, timestamp) VALUES 
(9, 'Question 3 for ChatHistory 9', 
 'Answer: Overview of key performance indicators and tracking methods. This answer provides a comprehensive review of our KPIs and benchmarks.', 
 'KPI Report, Analytics Dashboard', 
 '2025-02-16 17:15:00');

INSERT INTO chat_messages (chat_history_id, question, answer, sources, timestamp) VALUES 
(9, 'Question 4 for ChatHistory 9', 
 'Answer: Insights into recent client feedback and our responses. The answer includes detailed case studies and action items derived from the feedback.', 
 'Client Feedback, Support Logs', 
 '2025-02-16 17:20:00');

INSERT INTO chat_messages (chat_history_id, question, answer, sources, timestamp) VALUES 
(9, 'Question 5 for ChatHistory 9', 
 'Answer: Extended discussion on market trends and their influence on our strategy. A deep analysis of market data and forecasts is provided here.', 
 'Market Analysis, Research Report', 
 '2025-02-16 17:25:00');

INSERT INTO chat_messages (chat_history_id, question, answer, sources, timestamp) VALUES 
(9, 'Question 6 for ChatHistory 9', 
 'Answer: Comprehensive summary of our internal review findings and proposed next steps. The answer covers various aspects of our operational strategy.', 
 'Internal Review, Audit Report', 
 '2025-02-16 17:30:00');

-----------------------------------------------------------
-- For chat_history id = 20 (7 ngày trước)
INSERT INTO chat_messages (chat_history_id, question, answer, sources, timestamp) VALUES 
(20, 'Question 1 for ChatHistory 20', 
 'Answer: Detailed description of last week’s challenges, including supply chain issues and technical difficulties. This answer is extensive and covers multiple aspects.', 
 'Project Review, Incident Reports', 
 '2025-02-15 09:50:00');

INSERT INTO chat_messages (chat_history_id, question, answer, sources, timestamp) VALUES 
(20, 'Question 2 for ChatHistory 20', 
 'Answer: Elaboration on the mitigation strategies implemented to overcome the challenges. The answer provides in-depth details and action points.', 
 'Mitigation Plan, Expert Consultation', 
 '2025-02-15 09:55:00');

INSERT INTO chat_messages (chat_history_id, question, answer, sources, timestamp) VALUES 
(20, 'Question 3 for ChatHistory 20', 
 'Answer: Overview of the impact of these challenges on overall project progress. This answer explains several contributing factors in detail.', 
 'Progress Report, Team Meeting', 
 '2025-02-15 10:00:00');

INSERT INTO chat_messages (chat_history_id, question, answer, sources, timestamp) VALUES 
(20, 'Question 4 for ChatHistory 20', 
 'Answer: Comprehensive review of adjustments made in project planning to account for the issues encountered. The answer is elaborate and detailed.', 
 'Planning Document, Strategy Session', 
 '2025-02-15 10:05:00');

INSERT INTO chat_messages (chat_history_id, question, answer, sources, timestamp) VALUES 
(20, 'Question 5 for ChatHistory 20', 
 'Answer: Extended analysis of resource re-allocation and timeline modifications. The answer covers multiple details and provides actionable insights.', 
 'Resource Plan, Timeline Revision', 
 '2025-02-15 10:10:00');

INSERT INTO chat_messages (chat_history_id, question, answer, sources, timestamp) VALUES 
(20, 'Question 6 for ChatHistory 20', 
 'Answer: Final summary of the week’s review with recommendations for future improvements. This comprehensive answer is thorough and informative.', 
 'Review Summary, Recommendations', 
 '2025-02-15 10:15:00');
