import { useEffect, useState, useCallback } from 'react';
import { Guild, BotStatus } from '@/types/guild';
import { getDiscordGuilds } from '@/lib/discord';

export function useDiscordGuilds(accessToken: string | null) {
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [botStatus, setBotStatus] = useState<BotStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGuildsAndBotStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!accessToken) {
        setError('認証情報が見つかりません。再度ログインしてください。');
        setLoading(false);
        return;
      }
      const guildsData = await getDiscordGuilds(accessToken);
      const adminGuilds = guildsData.filter(guild => BigInt(guild.permissions) & BigInt(0x8));
      setGuilds(adminGuilds);
      if (adminGuilds.length > 0) {
        const guildIds = adminGuilds.map(guild => guild.id);
        const response = await fetch('/api/guilds/bot-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guildIds }),
        });
        if (response.ok) {
          const data = await response.json();
          setBotStatus(data.botStatus);
        } else {
          setError('Bot状況の取得に失敗しました');
        }
      }
    } catch (err) {
      setError('Discordサーバーの取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchGuildsAndBotStatus();
  }, [fetchGuildsAndBotStatus]);

  return { guilds, botStatus, loading, error, refresh: fetchGuildsAndBotStatus };
} 