import React, { useState, useEffect, useRef } from 'react';
import { useMessagingAPI } from '../../hooks/useMessagingAPI';
import { useChatHub } from '../../hooks/useChatHub';
import { useAuth } from '../../context/AuthContext';
import { getSignalRBaseUrl } from '../../api/BaseApi';

const AdminMessages = () => {
    const { user: currentUser } = useAuth();
    const messaging = useMessagingAPI();
    const chatHub = useChatHub();

    const [conversations, setConversations] = useState([]);
    const [chatUsers, setChatUsers] = useState([]);
    const [messages, setMessages] = useState({});
    const [activeChat, setActiveChat] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [messageInput, setMessageInput] = useState('');
    const [rightView, setRightView] = useState('empty');
    const [newGroupName, setNewGroupName] = useState('');
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [memberSearchTerm, setMemberSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [attachments, setAttachments] = useState([]);
    const [dropdownOpen, setDropdownOpen] = useState(null);
    const [showGroupMembers, setShowGroupMembers] = useState(false);
    const [previewAttachment, setPreviewAttachment] = useState(null);
    const [previewOpen, setPreviewOpen] = useState(false);
    const isComposingRef = useRef(false);
    const isSendingRef = useRef(false);

    const fileInputRef = useRef(null);
    const imageInputRef = useRef(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        loadConversations();
        loadChatUsers();
    }, []);

    const formatTime = (dateString) => {
        if (!dateString) return 'Vừa xong';
        
        // Thêm 'Z' nếu thiếu để đảm bảo parse như UTC
        const normalizedDateString = dateString.endsWith('Z') ? dateString : dateString + 'Z';
        const date = new Date(normalizedDateString);
        const now = new Date();
        
        // Lấy giờ:phút theo múi giờ local của trình duyệt (không hardcode)
        const timeFormatter = new Intl.DateTimeFormat('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        const timeStr = timeFormatter.format(date);
        
        // So sánh ngày dựa trên local time
        const dateOnlyFormatter = new Intl.DateTimeFormat('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        
        const dateStr = dateOnlyFormatter.format(date);
        const nowStr = dateOnlyFormatter.format(now);
        
        if (dateStr === nowStr) {
            return timeStr; // Hôm nay
        }
        
        // Tính số ngày chênh lệch
        const dateParsed = new Date(dateStr);
        const nowParsed = new Date(nowStr);
        const diffDays = Math.floor((nowParsed - dateParsed) / 86400000);
        
        if (diffDays === 1) return `Hôm qua ${timeStr}`; // Hôm qua
        if (diffDays < 7) return `${diffDays}d`; // Trong 7 ngày
        
        // Hiển thị ngày/tháng
        const parts = dateOnlyFormatter.formatToParts(date);
        const day = parts.find(p => p.type === 'day')?.value;
        const month = parts.find(p => p.type === 'month')?.value;
        return `${day}/${month} ${timeStr}`;
    };

    const formatMemberRole = (role) => {
        const value = String(role || '').trim();
        if (!value) return '';
        const normalized = value.toLowerCase();
        if (['nhat', 'nhất', 'undefined', 'null', 'n/a', 'na'].includes(normalized)) return '';
        return value;
    };

    const shouldShowMemberRole = (name, role) => {
        const formattedRole = formatMemberRole(role);
        if (!formattedRole) return false;
        const normalizedName = String(name || '').trim().toLowerCase();
        const normalizedRole = formattedRole.toLowerCase();
        if (!normalizedName) return false;
        return normalizedName !== normalizedRole && !normalizedName.includes(normalizedRole);
    };

    const getAttachmentType = (url) => {
        if (!url) return 'file';
        const extension = url.split('.').pop()?.split('?')[0]?.toLowerCase();
        return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(extension) ? 'image' : 'file';
    };

    const getAttachmentFullUrl = (url) => {
        if (!url) return url;
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        const backendOrigin = getSignalRBaseUrl().replace(/\/$/, '');
        if (url.startsWith('/')) {
            return `${backendOrigin}${url}`;
        }
        return `${backendOrigin}/${url}`;
    };

    const mapConversation = (c) => {
        const displayName = c?.displayName || c?.name || c?.title || 'Cuộc trò chuyện';
        const members = (c?.members || []).map(member => ({
            id: member?.userId || member?.id,
            name: member?.fullName || member?.name || 'Người dùng',
            role: member?.role || '',
            avatar: member?.avatarUrl || member?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member?.fullName || member?.name || 'User')}&background=6f42c1&color=fff`
        }));
        return {
            id: c?.conversationId || c?.id,
            isGroup: Boolean(c?.isGroup),
            name: displayName,
            title: c?.title || '',
            avatar: c?.avatarUrl || c?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=${c?.isGroup ? '6f42c1' : '0d6efd'}&color=fff`,
            lastMessage: c?.lastMessage || 'Không có tin nhắn',
            time: c?.lastMessageAt ? formatTime(c.lastMessageAt) : (c?.time || 'Vừa xong'),
            unread: c?.unreadCount ?? c?.unread ?? 0,
            isOnline: Boolean(c?.isOnline),
            members
        };
    };

    const dedupeById = (items) => {
        const seen = new Set();
        return items.filter(item => {
            const key = item?.id;
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    };

    const dedupeMessagesById = (items) => {
        const seen = new Set();
        return items.filter(item => {
            const key = item?.id;
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    };

    const loadConversations = async () => {
        setIsLoading(true);
        const convs = await messaging.getConversations();
        const mappedConvs = dedupeById(convs.map(mapConversation).filter(c => c.id));
        setConversations(mappedConvs);
        setIsLoading(false);
    };

    const loadChatUsers = async () => {
        const users = await messaging.getUsers();
        setChatUsers(dedupeById(users.map(u => ({
            id: u.id,
            name: u.name,
            role: u.role,
            avatar: u.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=198754&color=fff`
        }))));
    };

    const loadMessages = async (conversationId) => {
        if (!messages[conversationId]) {
            const msgs = await messaging.getMessages(conversationId);
            const mappedMessages = dedupeMessagesById(msgs.map(m => ({
                id: m.messageId,
                senderId: m.senderId,
                senderName: m.senderName,
                text: m.content,
                time: formatTime(m.createdAt),
                attachments: m.attachmentUrls && m.attachmentUrls.length > 0 ? m.attachmentUrls.map(url => ({
                    id: url,
                    type: getAttachmentType(url),
                    url: getAttachmentFullUrl(url),
                    name: url.split('/').pop(),
                    size: 'N/A'
                })) : null
            })));
            setMessages(prev => ({
                ...prev,
                [conversationId]: mappedMessages
            }));
        }
    };

    useEffect(() => {
        const unsubscribeMessageCreated = chatHub.on('message-created', (message) => {
            setMessages(prev => ({
                ...prev,
                [message.conversationId]: dedupeMessagesById([...(prev[message.conversationId] || []), {
                    id: message.messageId,
                    senderId: message.senderId,
                    senderName: message.senderName,
                    text: message.content,
                    time: formatTime(message.createdAt),
                    attachments: message.attachmentUrls && message.attachmentUrls.length > 0 ? message.attachmentUrls.map(url => ({
                        id: url,
                        type: getAttachmentType(url),
                        url: getAttachmentFullUrl(url),
                        name: url.split('/').pop(),
                        size: 'N/A'
                    })) : null
                }])
            }));

            setConversations(prev => prev.map(c => 
                c.id === message.conversationId 
                    ? { ...c, lastMessage: message.content, time: formatTime(message.createdAt), unread: 0 }
                    : c
            ));
        });

        const unsubscribeConversationUpdated = chatHub.on('conversation-updated', (conversation) => {
            if (!conversation?.conversationId) return;
            loadConversations();
        });

        return () => {
            unsubscribeMessageCreated?.();
            unsubscribeConversationUpdated?.();
        };
    }, [chatHub]);

    const handleFileSelect = (e, isImage) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const newAttachments = files.map(file => ({
            id: Date.now() + Math.random(),
            file: file,
            url: URL.createObjectURL(file),
            name: file.name,
            type: file.type.startsWith('image/') ? 'image' : 'file',
            size: (file.size / (1024 * 1024)).toFixed(2) + ' MB'
        }));

        setAttachments(prev => [...prev, ...newAttachments]);
        e.target.value = null;
    };

    const removeAttachment = (idToRemove) => {
        setAttachments(prev => prev.filter(att => att.id !== idToRemove));
    };

    const handleDownload = (attachment) => {
        const urlToDownload = attachment?.url;
        if (!urlToDownload) return;

        let isCrossOrigin = false;
        try {
            const downloadUrl = new URL(urlToDownload, window.location.href);
            isCrossOrigin = downloadUrl.origin !== window.location.origin;
        } catch {
            isCrossOrigin = false;
        }

        if (isCrossOrigin) {
            window.open(urlToDownload, '_blank', 'noopener');
            return;
        }

        const a = document.createElement('a');
        a.href = urlToDownload;
        a.download = attachment.name || 'TaiLieuDinhKem';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const openPreview = (attachment) => {
        if (!attachment?.url) return;
        setPreviewAttachment(attachment);
        setPreviewOpen(true);
    };

    const closePreview = () => {
        setPreviewOpen(false);
        setPreviewAttachment(null);
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (isSendingRef.current) return;
        if (!messageInput.trim() && attachments.length === 0) return;
        if (!activeChat) return;

        isSendingRef.current = true;
        const messageText = messageInput.trim();
        const filesToUpload = attachments.map(a => a.file).filter(Boolean);

        try {
            let attachmentUrls = [];
            if (filesToUpload.length > 0) {
                attachmentUrls = await messaging.uploadAttachments(filesToUpload);
            }

            const result = await messaging.sendMessage(activeChat, messageText, attachmentUrls);
            if (!result) {
                console.error('Lỗi gửi tin nhắn - result null');
                alert('Lỗi gửi tin nhắn, vui lòng thử lại');
            } else {
                console.log('Tin nhắn gửi thành công:', result);
                const mappedMessage = {
                    id: result.messageId,
                    senderId: result.senderId,
                    senderName: result.senderName,
                    text: result.content || '',
                    time: formatTime(result.createdAt),
                    attachments: result.attachmentUrls && result.attachmentUrls.length > 0 ? result.attachmentUrls.map(url => ({
                        id: url,
                        type: getAttachmentType(url),
                        url: getAttachmentFullUrl(url),
                        name: url.split('/').pop(),
                        size: 'N/A'
                    })) : null
                };

                setMessages(prev => ({
                    ...prev,
                    [activeChat]: dedupeMessagesById([...(prev[activeChat] || []), mappedMessage])
                }));

                setConversations(prev => prev.map(c =>
                    c.id === activeChat
                        ? { ...c, lastMessage: result.content, time: formatTime(result.createdAt), unread: 0 }
                        : c
                ));

                setMessageInput('');
                setAttachments([]);

                try {
                    await messaging.markAsRead(activeChat);
                } catch (markAsReadError) {
                    console.warn('Lỗi đánh dấu đã đọc:', markAsReadError);
                }
            }
        } catch (error) {
            console.error('Lỗi khi gửi tin nhắn:', error);
            alert('Lỗi khi gửi tin nhắn, vui lòng thử lại');
        } finally {
            isSendingRef.current = false;
        }
    };

    const handleSelectChat = async (chatId) => {
        setRightView('chat');
        setActiveChat(chatId);
        setShowGroupMembers(false);
        
        await loadMessages(chatId);
        await chatHub.joinConversation(chatId);
        
        setConversations(conversations.map(c => c.id === chatId ? { ...c, unread: 0 } : c));
    };

    const handleDeleteChat = (e, chatId) => {
        e.stopPropagation();
        if (window.confirm("Bạn có chắc chắn muốn xóa cuộc trò chuyện này không?")) {
            setConversations(conversations.filter(c => c.id !== chatId));
            if (activeChat === chatId) {
                setActiveChat(null);
                setRightView('empty');
            }
        }
        setDropdownOpen(null);
    };

    const handleCreateGroup = async () => {
        const sanitizedMembers = Array.from(new Set(selectedMembers)).filter(id => id && id !== currentUser?.id);

        if (!newGroupName.trim() || sanitizedMembers.length === 0) {
            alert('Vui lòng nhập tên nhóm và chọn thành viên!');
            return;
        }

        const result = await messaging.createGroupConversation(newGroupName, sanitizedMembers);
        if (result) {
            setSelectedMembers([]);
            setMemberSearchTerm('');
            await loadConversations();
            alert('Tạo nhóm thành công!');
        } else {
            alert('Lỗi tạo nhóm, vui lòng thử lại');
        }
    };

    const toggleMemberSelection = (contactId) => {
        setSelectedMembers(prev =>
            prev.includes(contactId) ? prev.filter(id => id !== contactId) : [...prev, contactId]
        );
    };

    const getSenderInfo = (senderId) => {
        if (senderId === currentUser.id) {
            return { name: currentUser.name || 'Admin', avatar: currentUser.avatar || 'https://ui-avatars.com/api/?name=Admin&background=0d6efd&color=fff' };
        }
        return chatUsers.find(u => u.id === senderId) || { name: 'Người dùng', avatar: '' };
    };

    const filteredConversations = conversations.filter(c =>
        (c?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredContacts = chatUsers.filter(c =>
        (c?.name || '').toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
        String(c?.id || '').toLowerCase().includes(memberSearchTerm.toLowerCase())
    ).filter(c => c?.id !== currentUser?.id);

    useEffect(() => {
        const handleClickOutside = () => setDropdownOpen(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (rightView === 'chat') scrollToBottom();
    }, [activeChat, messages, rightView, attachments]);

    return (
        <div className="d-flex h-100 bg-white rounded-4 shadow-sm overflow-hidden animate__animated animate__fadeIn" style={{ minHeight: '85vh', border: '1px solid #e9ecef' }}>

            {/* CỘT TRÁI */}
            <div className="d-flex flex-column border-end" style={{ width: '380px', backgroundColor: '#fdfdfd' }}>
                <div className="p-4 pb-3 border-bottom bg-white z-index-1 shadow-sm">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h4 className="fw-bold mb-0 text-dark" style={{ letterSpacing: '-0.5px' }}>Tin nhắn</h4>
                        <div className="d-flex gap-2">
                            <button className={`btn btn-light rounded-circle shadow-sm border-0 d-flex align-items-center justify-content-center ${rightView === 'create_group' ? 'bg-primary text-white' : 'text-secondary hover-bg-gray'}`}
                                style={{ width: '38px', height: '38px' }} onClick={() => setRightView('create_group')} title="Tạo nhóm">
                                <i className="bi bi-person-plus-fill fs-5"></i>
                            </button>
                        </div>
                    </div>
                    <div className="position-relative">
                        <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
                        <input type="text" className="form-control bg-light border-0 rounded-pill ps-5 py-2 shadow-none"
                            placeholder="Tìm kiếm đoạn chat..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                </div>

                <div className="overflow-y-auto custom-scrollbar flex-grow-1 p-3 pt-2 bg-white">
                    {isLoading ? (
                        <div className="text-center text-muted mt-5">
                            <div className="spinner-border spinner-border-sm" role="status">
                                <span className="visually-hidden">Đang tải...</span>
                            </div>
                        </div>
                    ) : filteredConversations.length > 0 ? (
                        filteredConversations.map((chat, chatIndex) => (
                            <div key={chat.id || `chat-${chatIndex}`}
                                className={`position-relative d-flex align-items-center p-3 mb-2 rounded-4 cursor-pointer transition-all chat-item-card 
                                ${activeChat === chat.id && rightView === 'chat' ? 'bg-primary-subtle border border-primary-subtle shadow-sm' : 'border border-transparent hover-bg-light'}`}
                                onClick={() => handleSelectChat(chat.id)}
                                onMouseLeave={() => setDropdownOpen(null)}>

                                <div className="position-relative me-3 flex-shrink-0">
                                    <img src={chat.avatar} className="rounded-circle shadow-sm border border-2 border-white" width="52" height="52" alt="avatar" />
                                    {chat.isGroup && <span className="position-absolute top-0 start-100 translate-middle p-1 bg-purple border border-white rounded-circle shadow-sm"><i className="bi bi-people-fill text-white d-block" style={{ fontSize: '9px', lineHeight: '1' }}></i></span>}
                                </div>

                                <div className="flex-grow-1 min-w-0 pe-4">
                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                        <h6 className={`mb-0 text-truncate ${chat.unread > 0 ? 'fw-bolder text-dark' : 'fw-bold text-dark'}`} style={{ fontSize: '15px' }}>{chat.name}</h6>
                                        <span className={`small ${chat.unread > 0 ? 'text-primary fw-bold' : 'text-muted'}`} style={{ fontSize: '11px' }}>{chat.time}</span>
                                    </div>
                                    <div className="d-flex justify-content-between align-items-center">
                                        <p className={`mb-0 small text-truncate pe-2 ${chat.unread > 0 ? 'fw-bold text-dark' : 'text-muted'}`} style={{ fontSize: '13px' }}>
                                            {chat.lastMessage}
                                        </p>
                                        {chat.unread > 0 && <span className="badge bg-danger rounded-pill shadow-sm">{chat.unread}</span>}
                                    </div>
                                </div>

                                <div className="position-absolute end-0 top-50 translate-middle-y me-2 action-menu-btn" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        className="btn btn-sm btn-light rounded-circle shadow-none text-muted"
                                        onClick={(e) => { e.stopPropagation(); setDropdownOpen(dropdownOpen === chat.id ? null : chat.id); }}
                                    >
                                        <i className="bi bi-three-dots"></i>
                                    </button>

                                    {dropdownOpen === chat.id && (
                                        <div className="position-absolute end-0 mt-1 bg-white border rounded-3 shadow-lg p-1 z-index-2" style={{ minWidth: '150px' }}>
                                            <button className="btn btn-sm w-100 text-start text-danger hover-bg-light" onClick={(e) => handleDeleteChat(e, chat.id)}>
                                                <i className="bi bi-trash me-2"></i> Xóa đoạn chat
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center text-muted mt-5 small fw-medium">Không có cuộc trò chuyện nào</div>
                    )}
                </div>
            </div>

            {/* CỘT PHẢI */}
            <div className="d-flex flex-column flex-grow-1 bg-white position-relative">

                {rightView === 'empty' && (
                    <div className="h-100 d-flex flex-column justify-content-center align-items-center text-muted bg-light" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'0.03\' fill-rule=\'evenodd\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'3\'/%3E%3Ccircle cx=\'13\' cy=\'13\' r=\'3\'/%3E%3C/g%3E%3C/svg%3E")' }}>
                        <div className="bg-white p-5 rounded-circle shadow-sm mb-4">
                            <i className="bi bi-chat-square-text text-primary" style={{ fontSize: '4rem', opacity: 0.8 }}></i>
                        </div>
                        <h4 className="fw-bold text-dark">Trung tâm kết nối</h4>
                        <p className="text-muted">Chọn một cuộc trò chuyện từ danh sách hoặc bắt đầu đoạn chat mới.</p>
                    </div>
                )}

                {rightView === 'create_group' && (
                    <div className="h-100 d-flex flex-column bg-light animate__animated animate__fadeIn">
                        <div className="p-3 border-bottom bg-white shadow-sm d-flex align-items-center">
                            <i className="bi bi-people-fill text-primary fs-4 me-2"></i>
                            <div>
                                <h5 className="mb-0 fw-bold">Tạo nhóm chat mới</h5>
                                <span className="small text-muted">Thêm các thành viên vào nhóm để trao đổi chung.</span>
                            </div>
                        </div>

                        <div className="p-4 flex-grow-1 overflow-y-auto custom-scrollbar">
                            <div className="card border-0 shadow-sm rounded-4 p-4 mx-auto bg-white" style={{ maxWidth: '600px' }}>
                                <div className="mb-4">
                                    <label className="fw-bold small text-dark mb-2">Tên nhóm chat:</label>
                                    <input type="text" className="form-control bg-light border-0 py-2 fw-medium" placeholder="VD: Tổ chuyên môn Tiếng Anh..."
                                        value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
                                </div>

                                <div className="mb-4">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <label className="fw-bold small text-dark mb-0">Chọn thành viên:</label>
                                        <span className="text-primary fw-bold small">{selectedMembers.length} đã chọn</span>
                                    </div>

                                    <div className="input-group input-group-sm mb-3 border rounded-pill overflow-hidden bg-light">
                                        <span className="input-group-text bg-transparent border-0 pe-2"><i className="bi bi-search text-muted"></i></span>
                                        <input
                                            type="text"
                                            className="form-control bg-transparent border-0 shadow-none"
                                            placeholder="Tìm kiếm theo Tên hoặc ID..."
                                            value={memberSearchTerm}
                                            onChange={(e) => setMemberSearchTerm(e.target.value)}
                                        />
                                    </div>

                                    <div className="border rounded-4 overflow-y-auto custom-scrollbar" style={{ maxHeight: '250px' }}>
                                        {filteredContacts.map((contact, contactIndex) => (
                                            <div key={contact.id || `contact-${contactIndex}`}
                                                className="d-flex justify-content-between align-items-center p-3 border-bottom hover-bg-light cursor-pointer transition-all"
                                                onClick={() => toggleMemberSelection(contact.id)}>
                                                <div className="d-flex align-items-center">
                                                    <img src={contact.avatar} className="rounded-circle me-3" width="36" height="36" alt="avt" />
                                                    <div>
                                                        <div className="fw-bold text-dark d-flex align-items-center gap-2" style={{ fontSize: '14px' }}>
                                                            {contact.name}
                                                        </div>
                                                        <div className="small text-muted" style={{ fontSize: '12px' }}>{contact.role}</div>
                                                    </div>
                                                </div>
                                                <div className="form-check">
                                                    <input className="form-check-input fs-5" type="checkbox" checked={selectedMembers.includes(contact.id)} readOnly />
                                                </div>
                                            </div>
                                        ))}
                                        {filteredContacts.length === 0 && (
                                            <div className="p-3 text-center text-muted small">Không tìm thấy người dùng nào phù hợp.</div>
                                        )}
                                    </div>
                                </div>

                                <button type="button" className="btn btn-primary rounded-pill fw-bold w-100 shadow-sm py-2 mt-2" onClick={handleCreateGroup}>
                                    <i className="bi bi-check-lg me-2"></i> Xác nhận tạo nhóm
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {rightView === 'chat' && activeChat && (() => {
                    const chatInfo = conversations.find(c => c.id === activeChat);
                    const chatMsgs = messages[activeChat] || [];

                    if (!chatInfo) return null;

                    return (
                        <div className="d-flex flex-column h-100 animate__animated animate__fadeIn">

                            {/* Header */}
                            <div className="p-3 px-4 border-bottom d-flex justify-content-between align-items-center bg-white shadow-sm z-index-1">
                                <div className="d-flex align-items-center cursor-pointer">
                                    <img src={chatInfo.avatar} className="rounded-circle me-3 shadow-sm border border-2 border-white" width="46" height="46" alt="avatar" />
                                    <div>
                                        <h5 className="mb-0 fw-bold text-dark" style={{ letterSpacing: '-0.3px' }}>{chatInfo.name}</h5>
                                        <div className="d-flex align-items-center gap-2 mt-1">
                                            {chatInfo.isGroup ? (
                                                <span className="small text-muted fw-medium" style={{ fontSize: '12px' }}>{chatInfo.members?.length || 0} thành viên</span>
                                            ) : (
                                                <span className="small text-muted fw-medium" style={{ fontSize: '12px' }}>{chatInfo.title || 'Tin nhắn riêng tư'}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {chatInfo.isGroup && chatInfo.members?.length > 0 && (
                                    <button
                                        type="button"
                                        className="btn btn-light border rounded-circle d-inline-flex align-items-center justify-content-center shadow-sm"
                                        style={{ width: '40px', height: '40px' }}
                                        onClick={() => setShowGroupMembers(prev => !prev)}
                                        aria-label="Xem thành viên nhóm"
                                        title="Xem thành viên nhóm"
                                    >
                                        <i className="bi bi-info-circle"></i>
                                    </button>
                                )}
                            </div>

                            {chatInfo.isGroup && showGroupMembers && chatInfo.members?.length > 0 && (
                                <div className="px-4 pb-3 pt-2 border-bottom bg-white">
                                    <div className="d-flex flex-wrap gap-2">
                                        {chatInfo.members.map((member) => (
                                            <span key={member.id} className="badge rounded-pill text-bg-light border text-dark d-inline-flex align-items-center gap-2 py-2 px-3">
                                                <img src={member.avatar} alt={member.name} className="rounded-circle" width="22" height="22" />
                                                <span>{member.name}{shouldShowMemberRole(member.name, member.role) ? ` · ${formatMemberRole(member.role)}` : ''}</span>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Messages */}
                            <div className="flex-grow-1 p-4 overflow-y-auto custom-scrollbar d-flex flex-column" style={{ backgroundColor: '#f8f9fa' }}>
                                <div className="text-center mb-4 mt-2">
                                    <span className="badge bg-white text-muted border px-3 py-2 shadow-sm fw-medium rounded-pill">Hôm nay</span>
                                </div>

                                {(() => {
                                    // Lọc những tin nhắn có nội dung thực tế (text hoặc attachment)
                                    const messagesWithContent = chatMsgs.filter(msg => 
                                        msg.text?.trim() || (msg.attachments && msg.attachments.length > 0)
                                    );
                                    
                                    return messagesWithContent.length > 0 ? (
                                        messagesWithContent.map((msg, index) => {
                                            const isSelf = msg.senderId === currentUser.id;
                                            const senderInfo = getSenderInfo(msg.senderId);
                                            const isSameSenderAsPrev = index > 0 && messagesWithContent[index - 1].senderId === msg.senderId;

                                            return (
                                                <div key={msg.id || `${msg.senderId || 'sender'}-${msg.time || 'time'}-${index}`} className={`d-flex mb-3 ${isSelf ? 'justify-content-end' : 'justify-content-start'}`}>
                                                    {!isSelf && (
                                                        <div style={{ width: '38px', marginRight: '10px' }}>
                                                            {!isSameSenderAsPrev && <img src={senderInfo.avatar} className="rounded-circle shadow-sm" width="36" height="36" alt="avt" />}
                                                        </div>
                                                    )}

                                                    <div className="d-flex flex-column" style={{ maxWidth: '70%' }}>
                                                        {!isSelf && chatInfo.isGroup && !isSameSenderAsPrev && (
                                                            <span className="small text-muted fw-bold ms-1 mb-1" style={{ fontSize: '12px' }}>{senderInfo.name}</span>
                                                        )}

                                                        {msg.attachments && msg.attachments.map((att, attIndex) => (
                                                            <div key={att.id || att.url || `att-${attIndex}`} className={`mb-1 ${isSelf ? 'text-end' : 'text-start'}`}>
                                                                {att.type === 'image' ? (
                                                                    <div className="position-relative d-inline-block">
                                                                        <img src={att.url} alt="attachment" className="rounded-4 shadow-sm border border-light cursor-pointer"
                                                                            style={{ maxWidth: '280px', maxHeight: '280px', objectFit: 'cover' }}
                                                                            onClick={() => openPreview(att)} />
                                                                    </div>
                                                                ) : (
                                                                    <div className={`d-inline-flex align-items-center p-3 rounded-4 shadow-sm border ${isSelf ? 'bg-primary text-white border-primary' : 'bg-white text-dark border-light'}`} style={{ minWidth: '240px' }}>
                                                                        <div className={`rounded p-2 me-3 ${isSelf ? 'bg-white bg-opacity-25' : 'bg-light text-primary'}`}><i className="bi bi-file-earmark-text-fill fs-3"></i></div>
                                                                        <div className="text-start me-2 flex-grow-1 min-w-0">
                                                                            <div className="fw-bold text-truncate" style={{ fontSize: '14px' }} title={att.name}>{att.name}</div>
                                                                            <div className="small opacity-75 mt-1" style={{ fontSize: '11px' }}>{att.size}</div>
                                                                        </div>
                                                                        <button
                                                                            className={`btn btn-sm rounded-circle shadow-none hover-scale ${isSelf ? 'btn-light text-primary' : 'btn-light text-primary'}`}
                                                                            onClick={() => openPreview(att)}
                                                                            title="Xem trước"
                                                                        >
                                                                            <i className="bi bi-eye"></i>
                                                                        </button>
                                                                        <button
                                                                            className={`btn btn-sm rounded-circle shadow-none hover-scale ${isSelf ? 'btn-light text-primary' : 'btn-light text-primary'}`}
                                                                            onClick={() => handleDownload(att)}
                                                                            title="Tải tệp này xuống"
                                                                        >
                                                                            <i className="bi bi-download"></i>
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}

                                                        {msg.text && (
                                                            <div className={`p-3 shadow-sm ${isSelf ? 'bg-primary text-white' : 'bg-white text-dark border border-light'}`}
                                                                style={{
                                                                    borderRadius: isSelf ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                                                    fontSize: '15px',
                                                                    lineHeight: '1.5'
                                                                }}>
                                                                {msg.text}
                                                            </div>
                                                        )}

                                                        <div className={`d-flex align-items-center mt-1 ${isSelf ? 'justify-content-end me-1' : 'ms-1'}`}>
                                                            <span className="small text-muted" style={{ fontSize: '11px' }}>{msg.time}</span>
                                                            {isSelf && <i className="bi bi-check2-all text-primary ms-1 fs-6"></i>}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-center text-muted small">Chưa có tin nhắn nào</div>
                                    );
                                })()}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div className="bg-white border-top p-3 px-4 position-relative">
                                {attachments.length > 0 && (
                                    <div className="d-flex gap-2 mb-3 pb-2 overflow-x-auto custom-scrollbar">
                                        {attachments.map((att, attIndex) => (
                                            <div key={att.id || att.url || `draft-att-${attIndex}`} className="position-relative border rounded-4 bg-light shadow-sm p-1 d-flex flex-column align-items-center justify-content-center" style={{ width: '90px', height: '90px', flexShrink: 0 }}>
                                                <button type="button" className="btn-close position-absolute top-0 end-0 bg-white border rounded-circle shadow-sm" style={{ transform: 'translate(30%, -30%)', padding: '5px' }} onClick={() => removeAttachment(att.id)}></button>
                                                {att.type === 'image' ? (
                                                    <img src={att.url} alt="prev" className="w-100 h-100 rounded-3 object-fit-cover" />
                                                ) : (
                                                    <div className="text-center p-2">
                                                        <i className="bi bi-file-earmark-pdf-fill fs-1 text-danger"></i>
                                                        <div className="text-truncate fw-medium mt-1 w-100" style={{ fontSize: '10px', maxWidth: '70px' }}>{att.name}</div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <form onSubmit={handleSendMessage} className="d-flex align-items-end gap-3 bg-light rounded-pill p-2 px-3 border shadow-sm">
                                    <input type="file" multiple ref={fileInputRef} className="d-none" onChange={(e) => handleFileSelect(e, false)} />
                                    <input type="file" multiple accept="image/*" ref={imageInputRef} className="d-none" onChange={(e) => handleFileSelect(e, true)} />

                                    <div className="d-flex gap-1 mb-1">
                                        <button type="button" className="btn btn-light rounded-circle text-primary shadow-none bg-transparent hover-bg-gray" title="Đính kèm tệp" onClick={() => fileInputRef.current.click()}>
                                            <i className="bi bi-paperclip fs-5"></i>
                                        </button>
                                        <button type="button" className="btn btn-light rounded-circle text-primary shadow-none bg-transparent hover-bg-gray" title="Gửi hình ảnh" onClick={() => imageInputRef.current.click()}>
                                            <i className="bi bi-image fs-5"></i>
                                        </button>
                                    </div>

                                    <textarea
                                        className="form-control border-0 bg-transparent shadow-none custom-scrollbar py-2 fs-6"
                                        placeholder={chatInfo.isGroup ? "Nhập tin nhắn tới nhóm..." : "Nhập tin nhắn..."}
                                        rows="1"
                                        style={{ resize: 'none', maxHeight: '120px' }}
                                        value={messageInput}
                                        onChange={(e) => setMessageInput(e.target.value)}
                                        onCompositionStart={() => { isComposingRef.current = true; }}
                                        onCompositionEnd={() => { isComposingRef.current = false; }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey && !isComposingRef.current) {
                                                e.preventDefault();
                                                handleSendMessage(e);
                                            }
                                        }}
                                    ></textarea>

                                    <button
                                        type="submit"
                                        className={`btn rounded-circle mb-1 ${messageInput.trim() || attachments.length > 0 ? 'btn-primary shadow-sm' : 'btn-secondary opacity-50 border-0'}`}
                                        disabled={!messageInput.trim() && attachments.length === 0}
                                        style={{ width: '42px', height: '42px', padding: '0', flexShrink: 0 }}
                                    >
                                        <i className="bi bi-send-fill fs-5"></i>
                                    </button>
                                </form>
                            </div>
                        </div>
                    );
                })()}
            </div>

            {previewOpen && previewAttachment && (
                <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ zIndex: 2500, backgroundColor: 'rgba(0,0,0,0.55)' }}>
                    <div className="bg-white rounded-4 shadow-lg overflow-hidden" style={{ width: '95%', maxWidth: '980px', maxHeight: '90vh' }}>
                        <div className="d-flex justify-content-between align-items-center p-3 border-bottom bg-white">
                            <div className="me-3" style={{ minWidth: 0 }}>
                                <div className="fw-semibold text-truncate" style={{ maxWidth: '520px' }}>{previewAttachment.name}</div>
                                <div className="small text-muted">{previewAttachment.size || 'N/A'}</div>
                            </div>
                            <div className="d-flex gap-2">
                                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={closePreview} title="Đóng xem trước">
                                    <i className="bi bi-x-lg"></i>
                                </button>
                                <button type="button" className="btn btn-sm btn-primary" onClick={() => handleDownload(previewAttachment)} title="Tải tệp này xuống">
                                    <i className="bi bi-download me-1"></i> Tải
                                </button>
                            </div>
                        </div>
                        <div className="bg-dark d-flex justify-content-center align-items-center" style={{ minHeight: '60vh', maxHeight: 'calc(90vh - 72px)' }}>
                            {previewAttachment.type === 'image' ? (
                                <img src={previewAttachment.url} alt={previewAttachment.name} className="img-fluid" style={{ maxHeight: '100%', maxWidth: '100%' }} />
                            ) : (
                                <iframe
                                    src={previewAttachment.url}
                                    title={previewAttachment.name}
                                    className="w-100 h-100 border-0"
                                    style={{ minHeight: '60vh' }}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .hover-bg-light:hover { background-color: #f8f9fa; }
                .hover-bg-gray:hover { background-color: #e9ecef !important; }
                .border-transparent { border-color: transparent !important; }
                .chat-item-card:hover { transform: translateX(2px); }
                .chat-item-card .action-menu-btn { opacity: 0; transition: opacity 0.2s; }
                .chat-item-card:hover .action-menu-btn { opacity: 1; }
                .cursor-pointer { cursor: pointer; }
                .transition-all { transition: all 0.2s ease-in-out; }
                .min-w-0 { min-width: 0; }
                .z-index-1 { z-index: 1; }
                .z-index-2 { z-index: 1050; }
                .bg-purple { background-color: #6f42c1 !important; }
                .hover-scale:hover { transform: scale(1.1); transition: 0.2s; }
            `}</style>
        </div>
    );
};

export default AdminMessages;
