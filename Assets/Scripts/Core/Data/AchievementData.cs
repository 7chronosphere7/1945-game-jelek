using UnityEngine;

namespace SkyAssault.Core.Data
{
    /// <summary>
    /// Configuration data representing a player achievement.
    /// </summary>
    [CreateAssetMenu(fileName = "NewAchievementData", menuName = "Sky Assault/Data/Achievement")]
    public class AchievementData : ScriptableObject
    {
        public string achievementId;
        public string title;
        [TextArea] public string description;
        public int coinReward = 100;
        
        /// <summary>
        /// Check if this achievement has been unlocked.
        /// </summary>
        public bool IsUnlocked(string[] completedIds)
        {
            if (completedIds == null) return false;
            foreach (var id in completedIds)
            {
                if (id == achievementId) return true;
            }
            return false;
        }
    }
}
