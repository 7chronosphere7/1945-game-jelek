using UnityEngine;

namespace SkyAssault.Core.Data
{
    /// <summary>
    /// Configuration data for player aircraft profiles.
    /// </summary>
    [CreateAssetMenu(fileName = "NewAircraftData", menuName = "Sky Assault/Data/Aircraft")]
    public class AircraftData : ScriptableObject
    {
        [Header("General Info")]
        public string id;
        public string aircraftName;
        public Sprite icon;
        [TextArea] public string description;

        [Header("Stats")]
        public float baseHp = 100f;
        public float baseArmor = 10f;
        public float baseSpeed = 5f;

        [Header("Weapons & Abilities")]
        public WeaponData primaryWeapon;
        public string ultimateName;
        public string passiveAbilityName;

        [Header("Visuals & Audio")]
        public GameObject prefab;
        public AudioClip selectionSound;

        [Header("Shop Settings")]
        public int unlockCost = 5000;
        public int baseUpgradeCost = 1000;
    }
}
