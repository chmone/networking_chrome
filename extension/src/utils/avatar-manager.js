/**
 * Avatar Management System
 * Uses random avatars from images.json instead of scraping LinkedIn profile pictures
 * PRIVACY: Avoids scraping personal profile images
 */

class AvatarManager {
  constructor() {
    this.avatarConfig = null;
    this.loadAvatarConfig();
  }

  /**
   * Load avatar configuration from images.json
   * @returns {Promise<void>}
   */
  async loadAvatarConfig() {
    try {
      const response = await fetch('../../ui/images.json');
      if (response.ok) {
        this.avatarConfig = await response.json();
        console.log('AvatarManager: Avatar config loaded successfully');
      } else {
        console.warn('AvatarManager: Failed to load images.json, using fallback');
        this.avatarConfig = this.getFallbackConfig();
      }
    } catch (error) {
      console.error('AvatarManager: Error loading avatar config:', error);
      this.avatarConfig = this.getFallbackConfig();
    }
  }

  /**
   * Get fallback avatar configuration
   * @returns {Object} Fallback avatar config
   */
  getFallbackConfig() {
    return {
      avatars: {
        random: [
          "https://i.imgur.com/jeKxn7N.png",
          "https://i.imgur.com/B5YRmn3.png",
          "https://i.imgur.com/JA6drqX.png"
        ],
        fallback: "https://i.imgur.com/jeKxn7N.png"
      },
      placeholders: {
        profile: "https://i.imgur.com/jeKxn7N.png"
      }
    };
  }

  /**
   * Get a random avatar URL
   * @param {string} profileId - Optional profile identifier for consistent assignment
   * @returns {string} Random avatar URL
   */
  getRandomAvatar(profileId = null) {
    if (!this.avatarConfig?.avatars?.random) {
      return this.getFallbackAvatar();
    }

    const avatars = this.avatarConfig.avatars.random;

    if (profileId) {
      // Use profile ID to get consistent avatar for same profile
      const hash = this.simpleHash(profileId);
      const index = hash % avatars.length;
      return avatars[index];
    } else {
      // Truly random selection
      const randomIndex = Math.floor(Math.random() * avatars.length);
      return avatars[randomIndex];
    }
  }

  /**
   * Get fallback avatar URL
   * @returns {string} Fallback avatar URL
   */
  getFallbackAvatar() {
    return this.avatarConfig?.avatars?.fallback ||
      this.avatarConfig?.placeholders?.profile ||
      "https://i.imgur.com/jeKxn7N.png";
  }

  /**
   * Get avatar for profile (user or target)
   * @param {Object} profile - Profile data
   * @param {string} profileType - 'user' or 'target'
   * @returns {string} Avatar URL
   */
  getAvatarForProfile(profile, profileType = 'user') {
    if (!profile) {
      return this.getFallbackAvatar();
    }

    // Create consistent ID from profile data
    const profileId = this.createProfileId(profile, profileType);

    // Get consistent random avatar for this profile
    return this.getRandomAvatar(profileId);
  }

  /**
   * Create consistent profile ID for avatar assignment
   * @param {Object} profile - Profile data
   * @param {string} profileType - Profile type
   * @returns {string} Profile identifier
   */
  createProfileId(profile, profileType) {
    // Create ID from profile name and type for consistency
    const nameComponent = (profile.name || '').toLowerCase().replace(/\s+/g, '');
    const headlineComponent = (profile.headline || '').toLowerCase().slice(0, 20);

    return `${profileType}_${nameComponent}_${headlineComponent}`;
  }

  /**
   * Simple hash function for consistent avatar selection
   * @param {string} str - String to hash
   * @returns {number} Hash value
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Assign avatar to profile data
   * @param {Object} profile - Profile data to modify
   * @param {string} profileType - Profile type
   * @returns {Object} Profile with avatar assigned
   */
  assignAvatarToProfile(profile, profileType = 'user') {
    if (!profile || typeof profile !== 'object') {
      return profile;
    }

    // Remove any scraped profile image URL
    delete profile.profileImageUrl;

    // Assign random avatar
    profile.avatarUrl = this.getAvatarForProfile(profile, profileType);
    profile.avatarSource = 'random_generated';

    return profile;
  }

  /**
   * Get loading/placeholder image
   * @returns {string} Loading image URL
   */
  getLoadingImage() {
    return this.avatarConfig?.placeholders?.loading ||
      "https://i.imgur.com/zU3v0QV.gif";
  }

  /**
   * Get all available avatar URLs
   * @returns {Array} Array of avatar URLs
   */
  getAllAvatars() {
    return this.avatarConfig?.avatars?.random || [];
  }

  /**
   * Preload all avatar images for better performance
   * @returns {Promise<void>}
   */
  async preloadAvatars() {
    try {
      const avatars = this.getAllAvatars();
      const preloadPromises = avatars.map(url => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = resolve;
          img.onerror = reject;
          img.src = url;
        });
      });

      await Promise.allSettled(preloadPromises);
      console.log('AvatarManager: Avatars preloaded successfully');
    } catch (error) {
      console.warn('AvatarManager: Avatar preloading failed:', error);
    }
  }

  /**
   * Get avatar configuration status
   * @returns {Object} Configuration status
   */
  getStatus() {
    return {
      configLoaded: !!this.avatarConfig,
      availableAvatars: this.getAllAvatars().length,
      fallbackAvatar: this.getFallbackAvatar(),
      loadingImage: this.getLoadingImage()
    };
  }
}

// Export for use in other modules
window.AvatarManager = AvatarManager;

// Auto-initialize if in extension context
if (typeof chrome !== 'undefined' && chrome.runtime) {
  window.avatarManager = new AvatarManager();
} 