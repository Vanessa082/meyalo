import AsyncStorage from '@react-native-async-storage/async-storage';

const SAVED_EVENTS_KEY = 'meyalo_saved_event_ids';

export const SavedEventsService = {
  /**
   * Retrieves all saved event IDs from AsyncStorage.
   */
  async getSavedEventIds(): Promise<string[]> {
    try {
      const json = await AsyncStorage.getItem(SAVED_EVENTS_KEY);
      if (!json) return [];
      return JSON.parse(json) as string[];
    } catch {
      return [];
    }
  },

  /**
   * Checks if a specific event ID is saved.
   */
  async isEventSaved(eventId: string): Promise<boolean> {
    const ids = await this.getSavedEventIds();
    return ids.includes(eventId);
  },

  /**
   * Toggles the saved state of an event ID. Returns true if saved, false if unsaved.
   */
  async toggleSaveEvent(eventId: string): Promise<boolean> {
    const ids = await this.getSavedEventIds();
    let updatedIds: string[];
    let isSavedNow: boolean;

    if (ids.includes(eventId)) {
      updatedIds = ids.filter((id) => id !== eventId);
      isSavedNow = false;
    } else {
      updatedIds = [...ids, eventId];
      isSavedNow = true;
    }

    try {
      await AsyncStorage.setItem(SAVED_EVENTS_KEY, JSON.stringify(updatedIds));
    } catch {
      // Ignore async storage save error
    }

    return isSavedNow;
  },
};
