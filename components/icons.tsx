
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import {
  Activity,
  ArrowDown,
  ArrowRight,
  Baseline,
  CheckCircle,
  ChevronDown,
  Download,
  Film,
  FileImage,
  Image,
  KeyRound,
  Layers,
  Plus,
  RefreshCw,
  Server,
  SlidersHorizontal,
  Sparkles,
  Tv,
  X,
  Wand2,
  Wallet,
  CreditCard,
  Play,
  History,
  LayoutGrid,
  List,
  Trash2,
  Copy,
  Clock,
  AlertCircle,
  Music,
  Type,
  Camera,
  Video as VideoIcon,
  Save,
  Send,
  MessageSquare,
  Bot,
  User
} from 'lucide-react';

const defaultProps = {
  strokeWidth: 1.5,
};

export const ActivityIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <Activity {...defaultProps} {...props} />
);

export const ServerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <Server {...defaultProps} {...props} />
);

export const CheckCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <CheckCircle {...defaultProps} {...props} />
);

export const KeyIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <KeyRound {...defaultProps} {...props} />
);

export const ArrowPathIcon: React.FC<React.SVGProps<SVGSVGElement>> = (
  props,
) => <RefreshCw {...defaultProps} {...props} />;

export const SparklesIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <Sparkles {...defaultProps} {...props} />
);

export const PlusIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <Plus {...defaultProps} {...props} />
);

export const ChevronDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (
  props,
) => <ChevronDown {...defaultProps} {...props} />;

export const SlidersHorizontalIcon: React.FC<React.SVGProps<SVGSVGElement>> = (
  props,
) => <SlidersHorizontal {...defaultProps} {...props} />;

export const ArrowRightIcon: React.FC<React.SVGProps<SVGSVGElement>> = (
  props,
) => <ArrowRight {...defaultProps} {...props} />;

export const RectangleStackIcon: React.FC<React.SVGProps<SVGSVGElement>> = (
  props,
) => <Layers {...defaultProps} {...props} />;

export const XMarkIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <X {...defaultProps} {...props} />
);

export const TextModeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <Baseline {...defaultProps} {...props} />
);

export const FramesModeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (
  props,
) => <Image {...defaultProps} {...props} />

export const ReferencesModeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (
  props,
) => <Film {...defaultProps} {...props} />

export const TvIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <Tv {...defaultProps} {...props} />
);

export const FilmIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <Film {...defaultProps} {...props} />
);

export const DownloadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <Download {...defaultProps} {...props} />
);

export const FileImageIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <FileImage {...defaultProps} {...props} />
);

export const CurvedArrowDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (
  props,
) => <ArrowDown {...props} strokeWidth={3} />;

export const WandIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <Wand2 {...defaultProps} {...props} />
);

export const WalletIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <Wallet {...defaultProps} {...props} />
);

export const CreditCardIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <CreditCard {...defaultProps} {...props} />
);

export const PlayIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <Play {...defaultProps} {...props} />
);

export const HistoryIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <History {...defaultProps} {...props} />
);

export const LayoutGridIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <LayoutGrid {...defaultProps} {...props} />
);

export const ListIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <List {...defaultProps} {...props} />
);

export const TrashIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <Trash2 {...defaultProps} {...props} />
);

export const CopyIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <Copy {...defaultProps} {...props} />
);

export const ClockIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <Clock {...defaultProps} {...props} />
);

export const AlertCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <AlertCircle {...defaultProps} {...props} />
);

export const MusicIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <Music {...defaultProps} {...props} />
);

export const TextIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <Type {...defaultProps} {...props} />
);

export const CameraIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <Camera {...defaultProps} {...props} />
);

export const VideoTabIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <VideoIcon {...defaultProps} {...props} />
);

export const ImageIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <Image {...defaultProps} {...props} />
);

export const SaveIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <Save {...defaultProps} {...props} />
);

export const SendIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <Send {...defaultProps} {...props} />
);

export const BotIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <Bot {...defaultProps} {...props} />
);

export const UserIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <User {...defaultProps} {...props} />
);

export const MessageSquareIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <MessageSquare {...defaultProps} {...props} />
);
