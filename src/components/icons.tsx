/**
 * Centralized Flaticon UIcons components for the entire app.
 * Style: regular-rounded (fi-rr-*)
 *
 * Usage:
 *   import { MailIcon } from '@/components/icons';
 *   <MailIcon size={16} className="text-muted-foreground" />
 */
import React from 'react';

interface FiProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

function fi(name: string) {
  const Comp = ({ size = 20, className, style }: FiProps) => (
    <i
      className={`fi fi-rr-${name}${className ? ` ${className}` : ''}`}
      style={{ fontSize: size, lineHeight: 1, display: 'inline-flex', alignItems: 'center', ...style }}
    />
  );
  Comp.displayName = `FiIcon(${name})`;
  return Comp;
}

// ── Chat / Messages ──
export const MessageCircleIcon = fi('comment');
export const BubbleChatIcon = fi('comment');
export const SentIcon = fi('paper-plane');
export const SendIcon = fi('paper-plane');
export const ReplyIcon = fi('reply-all');
export const SmileIcon = fi('smile');

// ── Mail ──
export const MailIcon = fi('envelope');

// ── Navigation / Arrows ──
export const ArrowLeftIcon = fi('arrow-left');
export const ArrowRightIcon = fi('arrow-right');
export const ArrowUpRightIcon = fi('arrow-up-right');
export const ChevronDoubleCloseIcon = fi('angle-double-right');

// ── Security ──
export const ShieldIcon = fi('shield');
export const ShieldAlertIcon = fi('shield-exclamation');
export const ShieldCheckIcon = fi('shield-check');
export const LockIcon = fi('lock');

// ── Eye / View ──
export const EyeIcon = fi('eye');
export const EyeOffIcon = fi('eye-crossed');

// ── User ──
export const UserIcon = fi('user');
export const UserPlusIcon = fi('user-add');
export const UserCheckIcon = fi('user-check');
export const UserMinusIcon = fi('user-minus');
export const UserXIcon = fi('user-slash');
export const UsersIcon = fi('users');

// ── Key ──
export const KeyRoundIcon = fi('key');
export const KeyIcon = fi('key');

// ── Loading ──
export const Loader2Icon = fi('spinner');

// ── Actions ──
export const CheckIcon = fi('check');
export const CheckCircle2Icon = fi('check-circle');
export const XIcon = fi('cross');
export const XCircleIcon = fi('cross-circle');
export const PlusIcon = fi('plus');
export const MinusIcon = fi('minus');
export const CopyIcon = fi('copy');
export const Trash2Icon = fi('trash');
export const PencilIcon = fi('pencil');
export const Edit2Icon = fi('pen-clip');

// ── Search ──
export const SearchIcon = fi('search');

// ── Menu / More ──
export const MenuIcon = fi('menu-burger');
export const MoreHorizontalIcon = fi('menu-dots');
export const MoreVerticalIcon = fi('menu-dots-vertical');

// ── Media ──
export const CameraIcon = fi('camera');
export const ImageIcon = fi('picture');
export const VideoIcon = fi('video-camera');
export const VideoOffIcon = fi('video-slash');
export const MusicIcon = fi('music');

// ── Audio ──
export const MicIcon = fi('microphone');
export const MicOffIcon = fi('microphone-slash');
export const Volume2Icon = fi('volume');
export const VolumeXIcon = fi('volume-slash');
export const HeadphonesIcon = fi('headphones');
export const HeadphoneOffIcon = fi('headphones');

// ── Phone / Calls ──
export const PhoneIcon = fi('phone-call');
export const PhoneOffIcon = fi('phone-slash');

// ── Wifi ──
export const WifiIcon = fi('wifi');
export const WifiOffIcon = fi('wifi-slash');

// ── Monitor / Screen ──
export const MonitorIcon = fi('computer');
export const MonitorUpIcon = fi('screen');
export const MonitorOffIcon = fi('computer');
export const Maximize2Icon = fi('expand');
export const Minimize2Icon = fi('compress');

// ── Settings / Config ──
export const SettingsIcon = fi('settings');

// ── File / Document ──
export const FileTextIcon = fi('document');
export const FileCheckIcon = fi('file-spreadsheet');
export const PaperclipIcon = fi('paperclip-vertical');

// ── Navigation / Pages ──
export const HomeIcon = fi('home');
export const CompassIcon = fi('compass-alt');
export const GlobeIcon = fi('world');
export const LinkIcon = fi('link');
export const Link2Icon = fi('link-alt');

// ── Notification / Bell ──
export const BellIcon = fi('bell');

// ── Time ──
export const ClockIcon = fi('clock');
export const CalendarIcon = fi('calendar');

// ── Server / Database ──
export const ServerIcon = fi('network');
export const DatabaseIcon = fi('database');

// ── Misc ──
export const HashIcon = fi('hastag');
export const FolderOpenIcon = fi('folder-open');
export const MegaphoneIcon = fi('megaphone');
export const DownloadIcon = fi('download');
export const UploadIcon = fi('upload');
export const RefreshCwIcon = fi('refresh');
export const PinIcon = fi('thumbtack');
export const CrownIcon = fi('crown');
export const AwardIcon = fi('badge');
export const BotIcon = fi('robot');
export const BugIcon = fi('bug');
export const HelpCircleIcon = fi('question');
export const CodeIcon = fi('code-simple');
export const BookOpenIcon = fi('book-open-cover');
export const TerminalIcon = fi('terminal');
export const TagIcon = fi('tags');

// ── Theme ──
export const MoonIcon = fi('moon');
export const SunIcon = fi('sun');
export const PaletteIcon = fi('palette');
export const PipetteIcon = fi('paint-brush');

// ── Auth ──
export const LogInIcon = fi('sign-in-alt');
export const LogOutIcon = fi('sign-out-alt');

// ── Energy / Flash ──
export const ZapIcon = fi('bolt');

// ── Alert ──
export const AlertTriangleIcon = fi('triangle-warning');
export const AlertIcon = fi('exclamation');

// ── Social / Engagement ──
export const StarIcon = fi('star');
export const HeartIcon = fi('heart');
export const SparklesIcon = fi('magic-wand');
export const FlameIcon = fi('fire-flame-simple');

// ── Finance ──
export const CreditCardIcon = fi('credit-card');

// ── Games / Fun ──
export const Gamepad2Icon = fi('gamepad');
export const GemIcon = fi('diamond');
export const SwordIcon = fi('sword');
export const SkullIcon = fi('skull');
export const HammerIcon = fi('axe');
export const WrenchIcon = fi('wrench-alt');

// ── Legal ──
export const ScaleIcon = fi('scale');

// ── Analytics ──
export const TrendingUpIcon = fi('chart-line-up');
export const BarChart3Icon = fi('chart-histogram');

// ── At Sign ──
export const AtSignIcon = fi('at');

// ── Rotate ──
export const RotateCwIcon = fi('rotate-right');
export const RotateCcwIcon = fi('rotate-left');

// ── Chevrons ──
export const ChevronDownIcon = fi('angle-down');
export const ChevronUpIcon = fi('angle-up');
export const ChevronRightIcon = fi('angle-right');

// ── Stop ──
export const StopCircleIcon = fi('stop-circle');

// ── Users Round (group variant) ──
export const UsersRoundIcon = fi('users');

// ── Ban / Block ──
export const BanIcon = fi('ban');

// ── Shield Off ──
export const ShieldOffIcon = fi('shield-slash');

// ── Handshake ──
export const HandshakeIcon = fi('handshake');

// ── Save (disk) ──
export const SaveIcon = fi('bookmark');

// ── Channel types (server-node) ──
export const ForumIcon = fi('comment-dots');
export const StageIcon = fi('presentation');
export const GalleryIcon = fi('picture');
export const PollIcon = fi('list-check');
export const SuggestionIcon = fi('bulb');
export const DocIcon = fi('document');
export const CountingIcon = fi('calculator');
export const VentIcon = fi('megaphone');
export const ThreadIcon = fi('comments');
export const IntroductionIcon = fi('users');
export const MediaIcon = fi('photo-video');
export const DirectoryIcon = fi('compass-alt');
export const ContentIcon = fi('magic-wand');
export const LayoutIcon = fi('columns');
