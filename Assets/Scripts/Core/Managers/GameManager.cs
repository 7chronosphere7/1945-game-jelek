using System;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace SkyAssault.Core.Managers
{
    /// <summary>
    /// Global game states.
    /// </summary>
    public enum GameState
    {
        Bootstrap,
        MainMenu,
        Hangar,
        Shop,
        Gameplay,
        GameOver,
        Victory
    }

    /// <summary>
    /// Coordinates high-level game states, scene loading, and player initialization.
    /// </summary>
    public class GameManager : MonoBehaviour
    {
        public static GameManager Instance { get; private set; }

        public GameState CurrentState { get; private set; } = GameState.Bootstrap;

        public event Action<GameState> OnStateChanged;

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
                DontDestroyOnLoad(gameObject);
            }
            else
            {
                Destroy(gameObject);
            }
        }

        private void Start()
        {
            UpdateState(GameState.MainMenu);
        }

        /// <summary>
        /// Updates the current game state and loads appropriate scenes if necessary.
        /// </summary>
        /// <param name="newState">The state to transition to.</param>
        public void UpdateState(GameState newState)
        {
            CurrentState = newState;

            switch (newState)
            {
                case GameState.MainMenu:
                    Time.timeScale = 1f;
                    break;
                case GameState.Hangar:
                    break;
                case GameState.Shop:
                    break;
                case GameState.Gameplay:
                    Time.timeScale = 1f;
                    break;
                case GameState.GameOver:
                    Time.timeScale = 0f;
                    break;
                case GameState.Victory:
                    Time.timeScale = 0f;
                    break;
            }

            OnStateChanged?.Invoke(newState);
        }

        /// <summary>
        /// Loads a designated game scene asynchronously.
        /// </summary>
        /// <param name="sceneName">The name of the scene to load.</param>
        public void LoadScene(string sceneName)
        {
            SceneManager.LoadSceneAsync(sceneName);
        }
    }
}
