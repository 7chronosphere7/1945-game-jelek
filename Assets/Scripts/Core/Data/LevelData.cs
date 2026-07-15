using UnityEngine;

namespace SkyAssault.Core.Data
{
    /// <summary>
    /// Configuration data representing a game stage/level.
    /// </summary>
    [CreateAssetMenu(fileName = "NewLevelData", menuName = "Sky Assault/Data/Level")]
    public class LevelData : ScriptableObject
    {
        [Header("General Settings")]
        public string levelId;
        public int chapterNumber;
        public string levelName;
        [TextArea] public string description;

        [Header("Scene Config")]
        public string gameplaySceneName;
        public AudioClip bgmMusic;

        [Header("Boss & Spawning")]
        public GameObject bossPrefab;
        public float timeBeforeBossSpawns = 60f;

        [Header("Rewards")]
        public int goldCompletionReward = 500;
        public int bonusScoreLimit = 10000;
    }
}
