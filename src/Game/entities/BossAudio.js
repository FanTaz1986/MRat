import { 
  playBossRoomMusic, 
  stopBossRoomMusic,
  playBossFlySound, 
  stopBossFlySound,
  playBossLandSound,
  playBossMeleeAttack,
  playBossRangeChargeUp,
  playBossDeathSound
} from '../../utils/AudioManager';
import { debugLog } from '../../development/utils/Debug';

/**
 * BossAudio.js
 * 
 * Handles all boss audio management and sound effects.
 * Centralized audio system for boss entity.
 */
export default class BossAudio {
  constructor(boss) {
    this.boss = boss;
    
    // Audio state tracking
    this.isFlyingSoundPlaying = false;
    this.isBossRoomMusicPlaying = false;
    
    debugLog('BossAudio system initialized', 'boss');
  }

  /**
   * Start boss room audio (music and fly sound if applicable)
   */
  startBossRoomAudio() {
    if (!this.isBossRoomMusicPlaying) {
      playBossRoomMusic();
      this.isBossRoomMusicPlaying = true;
      debugLog('Boss room music started', 'boss');
    }
    
    if (this.boss.phase === 'fly' && !this.isFlyingSoundPlaying) {
      playBossFlySound();
      this.isFlyingSoundPlaying = true;
      debugLog('Boss fly sound started', 'boss');
    }
  }

  /**
   * Stop boss room audio (music and fly sound)
   */
  stopBossRoomAudio() {
    if (this.isBossRoomMusicPlaying) {
      stopBossRoomMusic();
      this.isBossRoomMusicPlaying = false;
      debugLog('Boss room music stopped', 'boss');
    }
    
    if (this.isFlyingSoundPlaying) {
      stopBossFlySound();
      this.isFlyingSoundPlaying = false;
      debugLog('Boss fly sound stopped', 'boss');
    }
  }

  /**
   * Handle phase transition audio
   */
  onPhaseTransition(newPhase) {
    if (newPhase === 'ground') {
      // Stop fly sound and play land sound
      if (this.isFlyingSoundPlaying) {
        stopBossFlySound();
        this.isFlyingSoundPlaying = false;
        debugLog('Boss fly sound stopped for ground phase', 'boss');
      }
      playBossLandSound();
      debugLog('Boss land sound played', 'boss');
    } else if (newPhase === 'fly') {
      // Start fly sound
      if (!this.isFlyingSoundPlaying) {
        playBossFlySound();
        this.isFlyingSoundPlaying = true;
        debugLog('Boss fly sound started for fly phase', 'boss');
      }
    }
  }

  /**
   * Play boss death sound and stop all other audio
   */
  playDeathSound() {
    // Stop all boss audio first
    this.stopBossRoomAudio();
    
    // Play death sound
    playBossDeathSound(() => {
      debugLog('Boss death sound finished', 'boss');
    });
    
    debugLog('Boss death sound started', 'boss');
  }

  /**
   * Play melee attack sound
   */
  playMeleeAttackSound() {
    playBossMeleeAttack();
    debugLog('Boss melee attack sound played', 'boss');
  }

  /**
   * Play range charge up sound
   */
  playRangeChargeSound() {
    playBossRangeChargeUp();
    debugLog('Boss range charge sound played', 'boss');
  }

  /**
   * Get current audio state
   */
  getAudioState() {
    return {
      isFlyingSoundPlaying: this.isFlyingSoundPlaying,
      isBossRoomMusicPlaying: this.isBossRoomMusicPlaying
    };
  }

  /**
   * Cleanup and stop all audio
   */
  destroy() {
    this.stopBossRoomAudio();
    debugLog('BossAudio destroyed and all sounds stopped', 'boss');
  }
}
