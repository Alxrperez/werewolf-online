import { useGameStore, selectMyPlayer, selectAlivePlayers, selectIsHost, selectIsMyTurn } from "../stores/gameStore.js";
import { SessionState } from "@werewolf/shared";

export function useGameState() {
  const store = useGameStore();
  const myPlayer = useGameStore(selectMyPlayer);
  const alivePlayers = useGameStore(selectAlivePlayers);
  const isHost = useGameStore(selectIsHost);
  const isMyTurn = useGameStore(selectIsMyTurn);

  const phase = store.session?.state ?? SessionState.LOBBY;
  const isAlive = myPlayer?.isAlive ?? true;
  const isNight = phase === SessionState.NIGHT;
  const isDay = phase === SessionState.DAY_DISCUSSION || phase === SessionState.DAY_VOTE;
  const isLobby = phase === SessionState.LOBBY;
  const isGameOver = phase === SessionState.GAME_OVER;

  return {
    // Store refs
    playerId: store.playerId,
    session: store.session,
    myRole: store.myRole,
    myRoleDescription: store.myRoleDescription,
    myTeam: store.myTeam,
    myLoverId: store.myLoverId,
    myLoverName: store.myLoverName,
    masonIds: store.masonIds,
    // Computed
    myPlayer,
    alivePlayers,
    isHost,
    isMyTurn,
    isAlive,
    phase,
    isNight,
    isDay,
    isLobby,
    isGameOver,
    // Night
    nightWakeInfo: store.nightWakeInfo,
    seerResult: store.seerResult,
    sorceressResult: store.sorceressResult,
    hasSubmittedNightAction: store.hasSubmittedNightAction,
    // Day
    chatMessages: store.chatMessages,
    wwChatMessages: store.wwChatMessages,
    currentAccusation: store.currentAccusation,
    voteUpdate: store.voteUpdate,
    timerSecondsRemaining: store.timerSecondsRemaining,
    timerPhase: store.timerPhase,
    // Events
    lastDawnDeaths: store.lastDawnDeaths,
    lynchResult: store.lynchResult,
    hunterRevengeTargets: store.hunterRevengeTargets,
    gameOverData: store.gameOverData,
    lastError: store.lastError,
    isConnected: store.isConnected,
    // Little Girl
    littleGirlPeekColor: store.littleGirlPeekColor,
    caughtPeeking: store.caughtPeeking,
    peekCaughtInfo: store.peekCaughtInfo,
  };
}
