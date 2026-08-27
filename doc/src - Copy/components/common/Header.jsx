import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logout, setUser } from "@/store/slices/authSlice";
import { useUpdateCurrentUserMutation } from "@/store/api/userApi";
import {
  useGetMyNotificationsQuery,
  useMarkNotificationReadMutation,
} from "@/store/api/notificationApi";
import axiosInstance from "@/lib/axios";
import {
  Bell,
  Search,
  User,
  Settings,
  LogOut,
  Shield,
  ChevronDown,
  X,
  HelpCircle,
  KeyRound,
  Edit,
  Pencil,
} from "lucide-react";

function getInitials(name = "") {
  return name
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function formatRelativeTime(value) {
  if (!value) return "just now";
  const ms = Date.now() - new Date(value).getTime();
  const min = Math.max(1, Math.floor(ms / 60000));
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

function useOutsideClick(callback) {
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) callback();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [callback]);
  return ref;
}

function MenuItem({ icon: Icon, label, onClick, danger = false, divider = false }) {
  return (
    <>
      {divider && <div className="my-1 border-t border-gray-100" />}
      <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm rounded-lg transition-colors text-left
          ${danger
            ? "text-red-600 hover:bg-red-50"
            : "text-gray-700 hover:bg-gray-50"
          }`}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span>{label}</span>
      </button>
    </>
  );
}

function ProfileModal({ user, onClose, onOpenSettings, onLogout }) {
  const dispatch = useDispatch();
  const [updateCurrentUser, { isLoading: saving }] = useUpdateCurrentUserMutation();
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    avatar: user.profile_image || user.avatar || "",
    city: user.city || "",
    state: user.state || "",
    country: user.country || "",
    mobile: user.mobile || user.phone || "",
  });
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user.profile_image || user.avatar || "");

  const onChange = (field, val) => setForm((f) => ({ ...f, [field]: val }));
  const hasChanges =
    (form.name ?? "") !== (user.name ?? "") ||
    (form.city ?? "") !== (user.city ?? "") ||
    (form.state ?? "") !== (user.state ?? "") ||
    (form.country ?? "") !== (user.country ?? "") ||
    (form.mobile ?? "") !== (user.mobile ?? user.phone ?? "") ||
    !!avatarFile;

  const handleSave = async () => {
    setError("");
    try {
      let updated;
      if (avatarFile) {
        const fd = new FormData();
        fd.append("full_name", form.name);
        fd.append("name", form.name);
        fd.append("email", user.email);
        fd.append("image", avatarFile, avatarFile.name);
        fd.append("city", form.city || "");
        fd.append("state", form.state || "");
        fd.append("country", form.country || "");
        fd.append("mobile", form.mobile || "");
        const res = await axiosInstance.put("/owner/me", fd, {
          headers: { "Content-Type": undefined },
          withCredentials: true,
        });
        updated = res?.data?.data || {
          name: form.name,
          full_name: form.name,
          email: user.email,
          avatar: avatarPreview || form.avatar,
          city: form.city,
          state: form.state,
          country: form.country,
          mobile: form.mobile,
        };
        if (updated?.profile_image && !updated?.avatar) {
          updated.avatar = updated.profile_image;
        }
      } else {
        const payload = {
          full_name: form.name,
          name: form.name,
          email: user.email,
          avatar: form.avatar,
          city: form.city,
          state: form.state,
          country: form.country,
          mobile: form.mobile,
        };
        const resp = await updateCurrentUser(payload).unwrap();
        updated = resp?.data || payload;
        if (updated?.profile_image && !updated?.avatar) {
          updated.avatar = updated.profile_image;
        }
      }
      const merged = { ...user, ...updated };
      dispatch(setUser(merged));
      try { localStorage.setItem("user", JSON.stringify(merged)); } catch { }
      setEditing(false);
      setAvatarFile(null);
    } catch (e) {
      setError(e?.data?.message || e?.message || "Failed to update profile");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="h-24 bg-primary" />

        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-background/30 hover:bg-background/40 text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <button
          onClick={() => setEditing((p) => !p)}
          className="absolute top-3 right-14 w-8 h-8 flex items-center justify-center rounded-full bg-background/30 hover:bg-background/40 text-foreground transition-colors"
          title="Edit profile"
        >
          <Pencil className="w-4 h-4" />
        </button>

        <div className="absolute top-12 left-1/2 -translate-x-1/2">
          <div
            className="group relative w-20 h-20 rounded-full border-4 border bg-muted flex items-center justify-center shadow-lg overflow-hidden"
            onClick={() => fileInputRef.current?.click()}
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt={form.name} className="w-full h-full object-cover rounded-full transition-opacity group-hover:opacity-0" />
            ) : (
              <span className="text-2xl font-semibold text-foreground transition-opacity group-hover:opacity-0">{getInitials(form.name)}</span>
            )}
            <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <User className="w-5 h-5 text-foreground" />
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setAvatarFile(f);
                const url = URL.createObjectURL(f);
                setAvatarPreview(url);
              }
            }}
          />
        </div>

        <div className="pt-14 pb-6 px-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">Name</p>
                {editing ? (
                  <input
                    value={form.name}
                    onChange={(e) => onChange("name", e.target.value)}
                    className="w-full mt-0.5 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                ) : (
                  <h2 className="text-lg font-semibold text-gray-900 truncate">{form.name}</h2>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm text-gray-700 truncate mt-0.5">{form.email}</p>
              </div>
              <div className="ml-3 w-9 h-9 flex items-center justify-center rounded-xl text-gray-400" title="Email cannot be changed">
                <KeyRound className="w-4 h-4" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500">City</p>
                {editing ? (
                  <input
                    value={form.city}
                    onChange={(e) => onChange("city", e.target.value)}
                    className="w-full mt-0.5 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                ) : (
                  <p className="text-sm text-gray-700 mt-0.5">{form.city || "-"}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500">State</p>
                {editing ? (
                  <input
                    value={form.state}
                    onChange={(e) => onChange("state", e.target.value)}
                    className="w-full mt-0.5 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                ) : (
                  <p className="text-sm text-gray-700 mt-0.5">{form.state || "-"}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500">Country</p>
                {editing ? (
                  <input
                    value={form.country}
                    onChange={(e) => onChange("country", e.target.value)}
                    className="w-full mt-0.5 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                ) : (
                  <p className="text-sm text-gray-700 mt-0.5">{form.country || "-"}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500">Mobile</p>
                {editing ? (
                  <input
                    value={form.mobile}
                    onChange={(e) => onChange("mobile", e.target.value)}
                    className="w-full mt-0.5 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                ) : (
                  <p className="text-sm text-gray-700 mt-0.5">{form.mobile || "-"}</p>
                )}
              </div>
            </div>

            <div className="mt-1">
              <span className="inline-block px-3 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-full">
                {user.role}
              </span>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-2 rounded-lg bg-red-50 text-red-700 text-xs">
              {error}
            </div>
          )}

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              onClick={() => { onOpenSettings(); onClose(); }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors
                ${hasChanges && !saving ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-blue-200 text-white cursor-not-allowed"}
              `}
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Saving
                </>
              ) : (
                <>
                  <Edit className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>

          <div className="mt-3">
            <button
              onClick={() => { onLogout(); onClose(); }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 text-red-600 border border-red-100 text-sm font-medium hover:bg-red-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationsDropdown({ notifications, onClose, onMarkRead }) {
  const ref = useOutsideClick(onClose);
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="font-semibold text-gray-900 text-sm">Notifications</span>
        {unread > 0 && (
          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
            {unread} new
          </span>
        )}
      </div>
      <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors cursor-pointer ${!n.read ? "bg-blue-50/40" : ""
              }`}
            onClick={() => onMarkRead?.(n)}
          >
            <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${!n.read ? "bg-blue-500" : "bg-gray-300"}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-800">{n.text}</p>
              <p className="text-xs text-gray-400 mt-0.5">{n.time}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 py-3 border-t border-gray-100">
        <button className="text-xs text-blue-600 hover:underline font-medium">
          View all notifications
        </button>
      </div>
    </div>
  );
}

function ProfileDropdown({ user, onViewProfile, onLogout, onClose }) {
  const ref = useOutsideClick(onClose);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden p-1.5"
    >
      <div className="px-3 py-2.5 mb-1">
        <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
        <p className="text-xs text-gray-400 truncate">{user.email}</p>
      </div>

      <div className="border-t border-gray-100 pt-1">
        <MenuItem icon={User} label="View Profile" onClick={() => { onViewProfile(); onClose(); }} />
        <MenuItem icon={Settings} label="Account Settings" onClick={onClose} />
        <MenuItem icon={KeyRound} label="Change Password" onClick={onClose} />
        <MenuItem icon={Shield} label="Security" onClick={onClose} />
        <MenuItem icon={HelpCircle} label="Help & Support" onClick={onClose} />

        <MenuItem
          icon={LogOut}
          label="Sign Out"
          onClick={() => { onLogout(); onClose(); }}
          danger
          divider
        />
      </div>
    </div>
  );
}

const AdminHeader = ({ title = "Dashboard" }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const user = useSelector((state) => state.auth.user);
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  console.log("user", user);
  const displayName = user?.full_name || user?.name || "Admin User";
  const displayEmail = user?.email || "admin@example.com";
  const displayRole = user?.role?.name || user?.role || "Admin";
  const displayAvatar = user?.profile_image || user?.avatar || null;
  const initials = getInitials(displayName);

  const {
    data: notificationData,
    refetch: refetchNotifications,
  } = useGetMyNotificationsQuery(
    { page: 1, limit: 20 },
    {
      skip: !isAuthenticated,
      refetchOnFocus: false,
      refetchOnReconnect: false,
      refetchOnMountOrArgChange: false,
    }
  );
  const [markNotificationRead] = useMarkNotificationReadMutation();

  const notifications = (notificationData?.data?.rows || []).map((n) => ({
    id: n.id,
    text: n.title || n.message || "Notification",
    time: formatRelativeTime(n.created_at || n.createdAt),
    read: !!n.is_read,
    raw: n,
  }));
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkRead = async (n) => {
    if (!n?.id || n.read) return;
    try {
      await markNotificationRead(n.id).unwrap();
    } catch (_) { }
  };

  const handleLogout = useCallback(() => {
    dispatch(logout());
    navigate("/login");
  }, [dispatch, navigate]);

  useEffect(() => {
    if (!isAuthenticated || !showNotifications) return;
    refetchNotifications();
  }, [isAuthenticated, showNotifications, refetchNotifications]);

  return (
    <>
      <header className="h-16 border-b border-gray-200 bg-white/95 backdrop-blur sticky top-0 z-30">
        <div className="h-full px-4 md:px-6 flex items-center justify-between">

          <div className="flex items-center gap-4">
            <h1 className="text-lg md:text-xl font-semibold ml-12 lg:ml-0 text-gray-900">
             
            </h1>
          </div>

          <div className="flex items-center gap-2">

            <div className="hidden md:flex relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                placeholder="Search..."
                className="pl-9 pr-4 h-9 w-56 lg:w-64 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 transition-all"
              />
            </div>

            <button
              onClick={() => setShowSearch((p) => !p)}
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
            >
              <Search className="w-4 h-4 text-gray-600" />
            </button>

            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications((p) => !p);
                  setShowProfileDropdown(false);
                }}
                className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors relative"
              >
                <Bell className="w-4 h-4 text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
                )}
              </button>

              {showNotifications && (
                <NotificationsDropdown
                  notifications={notifications}
                  onMarkRead={handleMarkRead}
                  onClose={() => setShowNotifications(false)}
                />
              )}
            </div>

            <div className="hidden md:block w-px h-6 bg-gray-200 mx-1" />

            {isAuthenticated && (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowProfileDropdown((p) => !p);
                    setShowNotifications(false);
                  }}
                  className="flex items-center gap-2.5 rounded-xl pl-1 pr-2 py-1 hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                    {displayAvatar ? (
                      <img
                        src={displayAvatar}
                        alt={displayName}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-semibold text-white">{initials}</span>
                    )}
                  </div>

                  <div className="hidden lg:block text-left">
                    <p className="text-sm font-medium text-gray-900 leading-tight">{displayName}</p>
                    <p className="text-xs text-gray-400 leading-tight">{displayRole}</p>
                  </div>

                  <ChevronDown
                    className={`hidden lg:block w-3.5 h-3.5 text-gray-400 transition-transform ${showProfileDropdown ? "rotate-180" : ""
                      }`}
                  />
                </button>

                {showProfileDropdown && (
                  <ProfileDropdown
                    user={{
                      name: displayName,
                      email: displayEmail,
                      role: displayRole,
                      avatar: displayAvatar,
                    }}
                    onViewProfile={() => setShowProfileModal(true)}
                    onLogout={handleLogout}
                    onClose={() => setShowProfileDropdown(false)}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {showSearch && (
          <div className="md:hidden px-4 pb-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                autoFocus
                placeholder="Search..."
                className="w-full pl-9 pr-4 h-9 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 transition-all"
              />
            </div>
          </div>
        )}
      </header>

      {showProfileModal && (
        <ProfileModal
          user={{
            name: displayName,
            email: displayEmail,
            role: displayRole,
            avatar: displayAvatar,
          }}
          onClose={() => setShowProfileModal(false)}
          onOpenSettings={() => navigate("/app/settings")}
          onLogout={handleLogout}
        />
      )}
    </>
  );
};

export default AdminHeader;
