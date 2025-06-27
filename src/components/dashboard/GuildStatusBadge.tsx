import { Badge } from '@/components/ui/badge';
import { Bot, Database, Settings, Plus } from 'lucide-react';
import { BotStatus } from '@/types/guild';

export default function GuildStatusBadge({ status }: { status: BotStatus | null }) {
  if (!status) return null;
  if (status.hasBot) {
    const hasNotion = status.guildInfo?.notion_api_key && status.guildInfo?.notion_database_id;
    return (
      <div className="flex gap-2">
        <Badge variant="default" className="bg-emerald-100 text-emerald-800 border-emerald-200">
          <Bot className="w-3 h-3 mr-1" />
          Bot追加済み
        </Badge>
        {hasNotion ? (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
            <Database className="w-3 h-3 mr-1" />
            Notion連携済み
          </Badge>
        ) : (
          <Badge variant="outline" className="text-amber-600 border-amber-200">
            <Settings className="w-3 h-3 mr-1" />
            Notion未設定
          </Badge>
        )}
      </div>
    );
  } else {
    return (
      <Badge variant="outline" className="text-gray-600 border-gray-200">
        <Plus className="w-3 h-3 mr-1" />
        Bot未追加
      </Badge>
    );
  }
} 