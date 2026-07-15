using UnityEngine;
using UnityEngine.Audio;

namespace SkyAssault.Core.Managers
{
    /// <summary>
    /// Manages sound effects (SFX) and background music (BGM) mixing.
    /// </summary>
    public class AudioManager : MonoBehaviour
    {
        public static AudioManager Instance { get; private set; }

        [SerializeField] private AudioMixer audioMixer;
        [SerializeField] private AudioSource sfxSource;
        [SerializeField] private AudioSource musicSource;

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
            ApplySavedVolumes();
        }

        /// <summary>
        /// Applies sfx and music volume settings loaded from SaveManager.
        /// </summary>
        public void ApplySavedVolumes()
        {
            if (SaveManager.Instance == null) return;

            SetMusicVolume(SaveManager.Instance.CurrentData.VolumeMusic);
            SetSfxVolume(SaveManager.Instance.CurrentData.VolumeSfx);
        }

        /// <summary>
        /// Plays a music clip.
        /// </summary>
        /// <param name="clip">The AudioClip to play.</param>
        public void PlayMusic(AudioClip clip)
        {
            if (musicSource.clip == clip) return;

            musicSource.clip = clip;
            musicSource.loop = true;
            musicSource.Play();
        }

        /// <summary>
        /// Plays a sound effect one-shot.
        /// </summary>
        /// <param name="clip">The AudioClip to play.</param>
        public void PlaySfx(AudioClip clip)
        {
            sfxSource.PlayOneShot(clip);
        }

        /// <summary>
        /// Modifies the SFX mixer channel volume.
        /// </summary>
        /// <param name="volume">Volume scale between 0.0001f and 1f.</param>
        public void SetSfxVolume(float volume)
        {
            float db = Mathf.Log10(Mathf.Max(0.0001f, volume)) * 20f;
            audioMixer.SetFloat("SFXVolume", db);
            if (SaveManager.Instance != null) SaveManager.Instance.CurrentData.VolumeSfx = volume;
        }

        /// <summary>
        /// Modifies the BGM mixer channel volume.
        /// </summary>
        /// <param name="volume">Volume scale between 0.0001f and 1f.</param>
        public void SetMusicVolume(float volume)
        {
            float db = Mathf.Log10(Mathf.Max(0.0001f, volume)) * 20f;
            audioMixer.SetFloat("MusicVolume", db);
            if (SaveManager.Instance != null) SaveManager.Instance.CurrentData.VolumeMusic = volume;
        }
    }
}
