import { el, navigate } from '../ui/dom.js';
import { getGameData, updateGameData } from '../core/player.js';
import { sounds } from '../core/audio.js';
import { STICKERS, STICKER_GROUPS } from './stickers.js';

/** Álbum de pegatinas: las conseguidas a todo color, las que faltan como pista. */
export function mountAlbum(root) {
  const album = getGameData('album');
  const fresh = new Set(album.fresh);

  const sections = STICKER_GROUPS.map((group) => {
    const items = STICKERS.filter((item) => item.group === group.id);
    const owned = items.filter((item) => album.stickers.includes(item.id)).length;
    return el('section', { className: 'card album-group', style: { '--group-color': group.color } }, [
      el('h2', { className: 'album-group__title' }, [el('span', { text: group.title }), el('small', { text: `${owned}/${items.length}` })]),
      el(
        'ul',
        { className: 'sticker-grid' },
        items.map((item, index) => {
          const isOwned = album.stickers.includes(item.id);
          const isFresh = fresh.has(item.id);
          return el(
            'li',
            {
              className: `sticker ${isOwned ? 'is-owned' : ''} ${isFresh ? 'is-fresh' : ''}`,
              style: { '--tilt': `${((index % 5) - 2) * 2}deg` },
              attrs: { title: item.hint },
            },
            [
              el('span', { className: 'sticker__icon', text: isOwned ? item.icon : '❔', attrs: { 'aria-hidden': 'true' } }),
              el('strong', { className: 'sticker__name', text: isOwned ? item.name : '???' }),
              el('small', { className: 'sticker__hint', text: isOwned ? (isFresh ? '¡Nueva!' : '') : item.hint }),
            ],
          );
        }),
      ),
    ]);
  });

  const page = el('main', { className: 'page album' }, [
    el('header', { className: 'setup__header' }, [
      el('button', {
        className: 'icon-btn icon-btn--back',
        text: '⬅',
        attrs: { type: 'button', 'aria-label': 'Volver al menú' },
        on: { click: () => navigate('/') },
      }),
      el('h1', { className: 'setup__title', text: '📒 Mi álbum' }),
      el('span', { className: 'star-pill', text: `${album.stickers.length}/${STICKERS.length}` }),
    ]),
    el('p', { className: 'album__intro', text: 'Juega a los tres juegos y abre el cofre de cada día para llenar tu álbum.' }),
    ...sections,
  ]);
  root.append(page);

  if (fresh.size) {
    sounds.achievement();
    // Ya se vieron: la próxima vez dejan de salir como nuevas.
    updateGameData('album', { fresh: [] });
  }
}
