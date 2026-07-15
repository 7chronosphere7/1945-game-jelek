using System;
using System.IO;
using System.Collections.Generic;
using UnityEngine;

namespace SkyAssault.Core.Managers
{
    /// <summary>
    /// Holds serializable data representing player progress and game settings.
    /// </summary>
    [Serializable]
    public class SaveData
    {
        public int Coins = 1000;
        public int HighScore = 0;
        public int UnlockedChapters = 1;
        public string ActiveAircraftId = "striker_01";
        public List<string> UnlockedAircraftIds = new List<string> { "striker_01" };
        public List<string> CompletedAchievementIds = new List<string>();
        
        // Key: AircraftId, Value: Weapon level
        public List<string> UpgradesKeys = new List<string> { "striker_01" };
        public List<int> UpgradesValues = new List<int> { 1 };

        public float VolumeSfx = 0.8f;
        public float VolumeMusic = 0.6f;
    }

    /// <summary>
    /// Manages loading and saving user progression via JSON format.
    /// </summary>
    public class SaveManager : MonoBehaviour
    {
        public static SaveManager Instance { get; private set; }

        private string saveFilePath;
        public SaveData CurrentData { get; private set; }

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
                DontDestroyOnLoad(gameObject);
                saveFilePath = Path.Combine(Application.persistentDataPath, "savegame.json");
                Load();
            }
            else
            {
                Destroy(gameObject);
            }
        }

        /// <summary>
        /// Saves current save data to local storage.
        /// </summary>
        public void Save()
        {
            try
            {
                string json = JsonUtility.ToJson(CurrentData, true);
                File.WriteAllText(saveFilePath, json);
                Debug.Log($"Game saved successfully to: {saveFilePath}");
            }
            catch (Exception ex)
            {
                Debug.LogError($"Failed to save game data: {ex.Message}");
            }
        }

        /// <summary>
        /// Loads saved progress from local storage, or creates a new one if none exists.
        /// </summary>
        public void Load()
        {
            if (File.Exists(saveFilePath))
            {
                try
                {
                    string json = File.ReadAllText(saveFilePath);
                    CurrentData = JsonUtility.FromJson<SaveData>(json);
                    Debug.Log("Game data loaded.");
                }
                catch (Exception ex)
                {
                    Debug.LogError($"Failed to load game data, creating default: {ex.Message}");
                    CreateDefaultData();
                }
            }
            else
            {
                CreateDefaultData();
            }
        }

        private void CreateDefaultData()
        {
            CurrentData = new SaveData();
            Save();
        }

        private void OnApplicationQuit()
        {
            Save();
        }

        private void OnApplicationFocus(bool focus)
        {
            if (!focus)
            {
                Save();
            }
        }
    }
}
