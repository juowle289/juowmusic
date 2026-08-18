import { createContext, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'juowmusic-lang';
const LanguageContext = createContext(null);

// Deliberately not "every string in the app" - that would mean touching
// every page. Scoped to the surfaces that were part of this round of
// work (Settings, the Profile page chrome, and the rewritten Comments
// section) so the toggle is real and fully working everywhere it
// appears, rather than half-wired across the whole site. `t(key)` falls
// back to the English string (or the raw key) for anything not yet
// translated, so adding more surfaces later is just adding more keys
// here - nothing about the toggle itself needs to change.
const DICTIONARIES = {
  en: {
    'profile.back': 'Back',
    'profile.tab.overview': 'Overview',
    'profile.tab.explore': 'Explore',
    'profile.tab.settings': 'Settings',
    'settings.tab.account': 'Account',
    'settings.tab.appearance': 'Appearance',
    'settings.tab.activity': 'Activity Log',
    'settings.appearance.heading': 'Appearance',
    'settings.appearance.language': 'Language',
    'settings.appearance.theme': 'Theme',
    'settings.appearance.theme.light': 'Light',
    'settings.appearance.theme.dark': 'Dark',
    'settings.appearance.scopeNote':
      "Applies here in Settings and in Comments right away. The rest of the app's dark look is on the list for a follow-up pass.",
    'activity.heading': 'Activity Log',
    'activity.subheading': "A record of things you've done with this account.",
    'activity.empty': 'Nothing logged yet.',
    'activity.locked': 'Sign-in required to view',
    'activity.unlock': 'Verify to view',
    'activity.unlockPrompt': 'Enter your password to view this entry.',
    'activity.unlockPassword': 'Password',
    'activity.unlockConfirm': 'Verify',
    'activity.unlockCancel': 'Cancel',
    'activity.unlockError': 'Incorrect password.',
    'activity.type.comment_post': 'Posted a comment',
    'activity.type.comment_edit': 'Edited a comment',
    'activity.type.comment_delete': 'Deleted a comment',
    'activity.type.comment_restore': 'Restored a comment',
    'activity.type.report': 'Reported a comment',
    'activity.type.profile_update': 'Updated account info',
    'activity.restore': 'Restore',
    'activity.confirm.restoreTitle': 'Restore this comment?',
    'activity.confirm.restoreDesc': "It'll be posted again as a new comment with the same text.",
    'activity.confirm.restoreConfirm': 'Restore',
    'activity.toast.restored': 'Comment restored.',
    'activity.toast.restoreError': 'Could not restore this comment.',
    'activity.toast.alreadyRestored': 'This comment was already restored.',
    'activity.restored': 'Restored',
    'activity.page.prev': 'Previous',
    'activity.page.next': 'Next',
    'activity.page.of': 'Page {current} of {total}',
    'comments.heading': 'Comments',
    'comments.empty': 'Be the first to leave a comment.',
    'comments.placeholder': 'Write your comment ...',
    'comments.loginPrompt': 'to leave a comment.',
    'comments.loginLink': 'Log in',
    'comments.menu.report': 'Report',
    'comments.menu.delete': 'Delete',
    'comments.menu.edit': 'Edit',
    'comments.menu.save': 'Save',
    'comments.menu.cancel': 'Cancel',
    'comments.confirm.reportTitle': 'Report this comment?',
    'comments.confirm.reportDesc': "We'll note that you reported this comment.",
    'comments.confirm.deleteTitle': 'Delete this comment?',
    'comments.confirm.deleteDesc': 'This will permanently remove your comment.',
    'comments.confirm.cancel': 'Cancel',
    'comments.confirm.reportConfirm': 'Report',
    'comments.confirm.deleteConfirm': 'Delete',
    'comments.toast.reported': 'Comment reported.',
    'comments.toast.deleted': 'Comment deleted.',
    'comments.toast.edited': 'Comment updated.',
    'comments.reply': 'Reply',
    'comments.replyPlaceholder': 'Write a reply ...',
    'comments.replySubmit': 'Reply',
    'comments.replyCancel': 'Cancel',
    'comments.loadMore': 'Load more comments',
  },
  vi: {
    'profile.back': 'Quay lại',
    'profile.tab.overview': 'Tổng quan',
    'profile.tab.explore': 'Khám phá',
    'profile.tab.settings': 'Cài đặt',
    'settings.tab.account': 'Tài khoản',
    'settings.tab.appearance': 'Giao diện',
    'settings.tab.activity': 'Nhật ký hoạt động',
    'settings.appearance.heading': 'Giao diện',
    'settings.appearance.language': 'Ngôn ngữ',
    'settings.appearance.theme': 'Chủ đề',
    'settings.appearance.theme.light': 'Sáng',
    'settings.appearance.theme.dark': 'Tối',
    'settings.appearance.scopeNote':
      'Áp dụng ngay ở trang Cài đặt và phần Bình luận. Các trang còn lại vẫn đang dùng giao diện tối cố định, sẽ chuyển đổi ở đợt sau.',
    'activity.heading': 'Nhật ký hoạt động',
    'activity.subheading': 'Lịch sử các hoạt động bạn đã thực hiện với tài khoản này.',
    'activity.empty': 'Chưa có hoạt động nào.',
    'activity.locked': 'Cần xác thực để xem',
    'activity.unlock': 'Xác thực để xem',
    'activity.unlockPrompt': 'Nhập mật khẩu để xem mục này.',
    'activity.unlockPassword': 'Mật khẩu',
    'activity.unlockConfirm': 'Xác nhận',
    'activity.unlockCancel': 'Huỷ',
    'activity.unlockError': 'Sai mật khẩu.',
    'activity.type.comment_post': 'Đã đăng bình luận',
    'activity.type.comment_edit': 'Đã sửa bình luận',
    'activity.type.comment_delete': 'Đã xoá bình luận',
    'activity.type.comment_restore': 'Đã khôi phục bình luận',
    'activity.type.report': 'Đã báo cáo một bình luận',
    'activity.type.profile_update': 'Đã đổi thông tin tài khoản',
    'activity.restore': 'Khôi phục',
    'activity.confirm.restoreTitle': 'Khôi phục bình luận này?',
    'activity.confirm.restoreDesc': 'Bình luận sẽ được đăng lại với đúng nội dung cũ, dưới dạng một bình luận mới.',
    'activity.confirm.restoreConfirm': 'Khôi phục',
    'activity.toast.restored': 'Đã khôi phục bình luận.',
    'activity.toast.restoreError': 'Không thể khôi phục bình luận này.',
    'activity.toast.alreadyRestored': 'Bình luận này đã được khôi phục trước đó rồi.',
    'activity.restored': 'Đã khôi phục',
    'activity.page.prev': 'Trước',
    'activity.page.next': 'Sau',
    'activity.page.of': 'Trang {current}/{total}',
    'comments.heading': 'Bình luận',
    'comments.empty': 'Hãy là người đầu tiên bình luận.',
    'comments.placeholder': 'Viết bình luận của bạn...',
    'comments.loginPrompt': 'để bình luận.',
    'comments.loginLink': 'Đăng nhập',
    'comments.menu.report': 'Báo cáo',
    'comments.menu.delete': 'Xoá',
    'comments.menu.edit': 'Sửa',
    'comments.menu.save': 'Lưu',
    'comments.menu.cancel': 'Huỷ',
    'comments.confirm.reportTitle': 'Báo cáo bình luận này?',
    'comments.confirm.reportDesc': 'Chúng tôi sẽ ghi nhận rằng bạn đã báo cáo bình luận này.',
    'comments.confirm.deleteTitle': 'Xoá bình luận này?',
    'comments.confirm.deleteDesc': 'Bình luận của bạn sẽ bị xoá vĩnh viễn.',
    'comments.confirm.cancel': 'Huỷ',
    'comments.confirm.reportConfirm': 'Báo cáo',
    'comments.confirm.deleteConfirm': 'Xoá',
    'comments.toast.reported': 'Đã báo cáo bình luận.',
    'comments.toast.deleted': 'Đã xoá bình luận.',
    'comments.toast.edited': 'Đã cập nhật bình luận.',
    'comments.reply': 'Trả lời',
    'comments.replyPlaceholder': 'Viết trả lời...',
    'comments.replySubmit': 'Trả lời',
    'comments.replyCancel': 'Huỷ',
    'comments.loadMore': 'Tải thêm bình luận',
  },
};

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    if (typeof window === 'undefined') return 'en';
    return localStorage.getItem(STORAGE_KEY) ?? 'en';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (next) => setLangState(next === 'vi' ? 'vi' : 'en');
  const t = (key) => DICTIONARIES[lang]?.[key] ?? DICTIONARIES.en[key] ?? key;

  return <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
