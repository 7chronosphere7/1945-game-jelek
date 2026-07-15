using UnityEngine;
using UnityEngine.UI;
using TMPro;
using SkyAssault.Player;
using SkyAssault.Core.Managers;

namespace SkyAssault.UI
{
    /// <summary>
    /// Updates HUD views (health, shield, scores, coins) dynamically during gameplay.
    /// </summary>
    public class HUDController : MonoBehaviour
    {
        [Header("Player Reference")]
        [SerializeField] private PlayerController player;

        [Header("HUD Sliders")]
        [SerializeField] private Slider healthSlider;
        [SerializeField] private Slider shieldSlider;

        [Header("TextMeshPro Texts")]
        [SerializeField] private TextMeshProUGUI scoreText;
        [SerializeField] private TextMeshProUGUI coinText;
        [SerializeField] private TextMeshProUGUI comboText;

        private int currentScore;
        private int comboCount;
        private float comboTimer;

        private void Start()
        {
            ResetHUD();
        }

        private void Update()
        {
            UpdatePlayerBars();
            UpdateComboTimer();
        }

        private void ResetHUD()
        {
            currentScore = 0;
            comboCount = 0;
            UpdateScoreText();
            UpdateCoinText();
            if (comboText != null) comboText.gameObject.SetActive(false);
        }

        private void UpdatePlayerBars()
        {
            if (player == null) return;

            if (healthSlider != null) healthSlider.value = player.HealthPercentage;
            if (shieldSlider != null) shieldSlider.value = player.ShieldPercentage;
        }

        private void UpdateComboTimer()
        {
            if (comboCount > 0)
            {
                comboTimer -= Time.deltaTime;
                if (comboTimer <= 0f)
                {
                    comboCount = 0;
                    if (comboText != null) comboText.gameObject.SetActive(false);
                }
            }
        }

        /// <summary>
        /// Adds score points and increases the combo multiplier.
        /// </summary>
        public void AddScore(int points)
        {
            comboCount++;
            comboTimer = 3.0f; // 3 seconds window to chain combos

            int comboMultiplier = Mathf.Min(10, 1 + (comboCount / 5));
            currentScore += points * comboMultiplier;

            UpdateScoreText();

            if (comboText != null)
            {
                comboText.gameObject.SetActive(true);
                comboText.text = $"COMBO x{comboMultiplier}";
            }
        }

        /// <summary>
        /// Synchronizes coin display with the loaded SaveManager data.
        /// </summary>
        public void UpdateCoinText()
        {
            if (coinText != null && SaveManager.Instance != null)
            {
                coinText.text = $"COINS: {SaveManager.Instance.CurrentData.Coins}";
            }
        }

        private void UpdateScoreText()
        {
            if (scoreText != null)
            {
                scoreText.text = $"SCORE: {currentScore:D6}";
            }
        }
    }
}
