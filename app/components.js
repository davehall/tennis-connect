(function(global){
  // Shared UI components (Logo & Icons) exposed on window for inline React
  const pickVariant = (variant) => {
    const v = (variant||'').toString().toLowerCase();
    return v === 'light' ? 'light' : (v === 'dark' ? 'dark' : '');
  };
  const Logo = ({ className, textColor = 'text-slate-800', variant }) => {
    // Support variant-specific overrides, then fall back to single URL/SVG
    const v = pickVariant(variant);
    const w = (typeof window !== 'undefined') ? window : {};
    const urlLight = w.SITE_LOGO_URL_LIGHT || '';
    const urlDark  = w.SITE_LOGO_URL_DARK  || '';
    const svgLight = w.SITE_LOGO_SVG_LIGHT || '';
    const svgDark  = w.SITE_LOGO_SVG_DARK  || '';
    const anyUrl   = w.SITE_LOGO_URL || '';
    const anySvg   = w.SITE_LOGO_SVG || '';

    // Resolve chosen asset
    let useSvg = '';
    let useUrl = '';
    if (v === 'light') {
      useSvg = String(svgLight||'');
      useUrl = String(urlLight||'');
    } else if (v === 'dark') {
      useSvg = String(svgDark||'');
      useUrl = String(urlDark||'');
    }
    if (!useSvg && !useUrl) {
      useSvg = String(anySvg||'');
      useUrl = String(anyUrl||'');
    }

    const iconEl = useSvg
      ? React.createElement('span', { className:'inline-block h-28 md:h-8', role:'img', 'aria-label':'Tennis Club Connect', dangerouslySetInnerHTML:{ __html: useSvg } })
      : (useUrl
        ? React.createElement('img', { src: useUrl, alt:'Tennis Club Connect', className:'h-7 md:h-8 w-auto inline-block', decoding:'async', loading:'eager' })
        : React.createElement('svg', { className:'h-6 w-6 md:h-7 md:w-7', viewBox:'0 0 83 83', fill:'none', xmlns:'http://www.w3.org/2000/svg', role:'img', 'aria-label':'Tennis Club Connect logo' },
            React.createElement('circle', { cx:41.5, cy:41.5, r:41.5, fill:'#14B8A6'}),
            React.createElement('g', { transform:'translate(41.5 41.5) scale(1) translate(-43 -43)' },
              React.createElement('path', { d:'M38.9845 8.88541C28.718 -1.38108 16.9695 -1.89232 7.55858 7.51857C-1.8523 16.9295 -1.34177 28.6787 8.92471 38.9452C14.4847 44.5052 21.1669 47.9106 27.5082 48.9614L27.4976 48.9932C27.7111 49.0568 28.0025 49.1389 28.3673 49.2393C40.0169 52.4587 49.5593 57.7246 56.728 64.8876L74.5089 82.6685L82.7078 74.4696L64.9262 56.6879C57.7639 49.5186 52.498 39.9776 49.2786 28.3266C49.1789 27.9624 49.0962 27.6718 49.0304 27.459L49 27.4682C47.9513 21.1261 44.5445 14.4454 38.9845 8.88541ZM77.2418 74.4696L74.5096 77.2018L59.48 62.1723L62.2123 59.44L77.2418 74.4696ZM59.579 56.6073L56.6474 59.539C51.3667 54.9456 45.0812 51.2029 37.8694 48.3483C40.3478 47.5486 42.5971 46.2624 44.4498 44.4097C46.3031 42.5564 47.5879 40.3085 48.3883 37.8294C51.2415 45.0412 54.9857 51.3267 59.579 56.6073ZM41.7168 41.6768C34.9349 48.4586 21.4511 46.0057 11.657 36.2115C2.97299 27.5276 2.47519 18.0665 10.2908 10.2508C18.1058 2.43588 27.5669 2.93369 36.2509 11.6177C46.045 21.4118 48.4958 34.8977 41.7168 41.6768ZM32.1525 14.3499C32.5301 13.9723 32.5301 13.3614 32.1525 12.9838C31.7749 12.6062 31.1639 12.6062 30.7863 12.9838L28.7364 15.0337L26.0035 12.3007L28.0534 10.2508C28.431 9.87323 28.431 9.26229 28.0534 8.8847C27.6758 8.5071 27.0648 8.5071 26.6872 8.8847L24.6373 10.9346L22.5881 8.8854C22.2105 8.50781 21.5996 8.50639 21.2213 8.8847C20.8444 9.26158 20.8444 9.87394 21.222 10.2515L23.2712 12.3007L20.5396 15.0323L18.4905 12.9831C18.1129 12.6055 17.5005 12.6055 17.1222 12.9838C16.7453 13.3607 16.7453 13.973 17.1229 14.3506L19.1721 16.3998L16.4398 19.1321L14.3906 17.0829C14.0131 16.7053 13.4014 16.7046 13.0238 17.0822C12.6455 17.4605 12.6455 18.0728 13.0231 18.4504L15.0723 20.4996L12.3407 23.2312L10.2915 21.182C9.91395 20.8044 9.3016 20.8044 8.92471 21.1813C8.54641 21.5596 8.54782 22.1705 8.92542 22.5481L10.9746 24.5973L8.92471 26.6472C8.54712 27.0248 8.54782 27.6365 8.92471 28.0133C9.30231 28.3909 9.91325 28.3909 10.2908 28.0133L12.3407 25.9634L15.0737 28.6964L13.0238 30.7463C12.6462 31.1239 12.6462 31.7349 13.0238 32.1124C13.4014 32.49 14.0123 32.49 14.3899 32.1124L16.4398 30.0625L19.1728 32.7955L17.1229 34.8454C16.7453 35.223 16.7453 35.834 17.1229 36.2115C17.4998 36.5884 18.1114 36.5891 18.489 36.2115L20.5389 34.1616L23.2712 36.8939L21.2213 38.9438C20.8437 39.3214 20.8444 39.933 21.222 40.3106C21.5996 40.6882 22.2105 40.6882 22.5881 40.3106L24.638 38.2607L26.6872 40.3099C27.0648 40.6875 27.6751 40.6882 28.0534 40.3099C28.4303 39.933 28.4303 39.3207 28.0534 38.9438L26.0042 36.8946L28.7357 34.1631L30.7849 36.2123C31.1625 36.5898 31.7742 36.5891 32.1525 36.2108C32.5301 35.8332 32.5293 35.2216 32.1525 34.8447L30.1033 32.7955L32.8355 30.0633L34.8847 32.1124C35.2623 32.49 35.874 32.4893 36.2509 32.1124C36.6292 31.7341 36.6292 31.1218 36.2523 30.7449L34.2031 28.6957L36.9346 25.9642L38.9838 28.0133C39.3614 28.3909 39.9731 28.3902 40.35 28.0133C40.7283 27.635 40.7268 27.0241 40.3499 26.6472L38.3008 24.598L40.3507 22.5481C40.7283 22.1705 40.7283 21.5596 40.3507 21.182C39.9731 20.8044 39.3621 20.8044 38.9845 21.182L36.9346 23.2319L34.2024 20.4996L36.2523 18.4497C36.6299 18.0721 36.6292 17.4605 36.2523 17.0836C35.8747 16.706 35.2637 16.706 34.8861 17.0836L32.8362 19.1335L30.1033 16.4005L32.1525 14.3499ZM27.3696 32.7969L24.638 35.5285L21.9058 32.7962L24.6373 30.0647L27.3696 32.7969ZM23.2705 28.6978L20.5389 31.4294L17.806 28.6964L20.5375 25.9649L23.2705 28.6978ZM19.1714 24.5987L16.4398 27.3303L13.7069 24.5973L16.4384 21.8658L19.1714 24.5987ZM31.4694 28.6971L28.7371 31.4294L26.0049 28.6971L28.7371 25.9649L31.4694 28.6971ZM27.3703 24.598L24.638 27.3303L21.9051 24.5973L24.6373 21.8651L27.3703 24.598ZM23.2712 20.4989L20.5389 23.2312L17.806 20.4982L20.5382 17.766L23.2712 20.4989ZM35.5678 24.5987L32.8362 27.3303L30.104 24.598L32.8355 21.8665L35.5678 24.5987ZM31.4687 20.4996L28.7371 23.2312L26.0042 20.4982L28.7357 17.7667L31.4687 20.4996ZM27.3696 16.4005L24.638 19.1321L21.9051 16.3991L24.6366 13.6676L27.3696 16.4005Z', fill:'white' })
            )
          )
        );
    // If a custom logo is provided (any variant/url/svg), render it alone without the text label
    if (useSvg || useUrl) {
      return React.createElement('div', { className: `flex items-center ${className||''}` }, iconEl);
    }
    // Default mark + word label
    return React.createElement('div', { className: `flex items-center justify-center space-x-2 ${className||''}` },
      iconEl,
      React.createElement('span', { className:`font-heading text-xl md:text-2xl ${textColor}` }, 'Tennis Club Connect')
    );
  };

  const iconFactory = (pathPropsArray, svgProps={}) => ({ className='h-5 w-5' }) => (
    React.createElement('svg', { xmlns:'http://www.w3.org/2000/svg', className, fill:'none', viewBox:'0 0 24 24', stroke:'currentColor', strokeWidth:2, ...svgProps },
      pathPropsArray.map((p,i)=> React.createElement('path', { key:i, ...p }))
    )
  );

  const SearchIcon = iconFactory([{ strokeLinecap:'round', strokeLinejoin:'round', d:'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' }]);
  const ListIcon = iconFactory([{ strokeLinecap:'round', strokeLinejoin:'round', d:'M4 6h16M4 10h16M4 14h16M4 18h16' }]);
  const MapViewIcon = iconFactory([{ strokeLinecap:'round', strokeLinejoin:'round', d:'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 16.382V5.618a1 1 0 00-1.447-.894L15 7m-6 10l6-3m0 0l6-3m-6 3V7' }]);

  const CourtIcon = ({ className='h-5 w-5', title='Court' }) => (
    React.createElement('svg', { viewBox:'0 0 24 24', className, xmlns:'http://www.w3.org/2000/svg', fill:'none', stroke:'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round', role:'img', 'aria-label':title },
      title ? React.createElement('title', null, title) : null,
      React.createElement('rect', { x:3, y:5, width:18, height:14, rx:1 }),
      React.createElement('line', { x1:12, y1:5, x2:12, y2:19 }),
      React.createElement('line', { x1:8, y1:5, x2:8, y2:19, strokeWidth:1 }),
      React.createElement('line', { x1:16, y1:5, x2:16, y2:19, strokeWidth:1 }),
      React.createElement('line', { x1:3, y1:12, x2:21, y2:12, strokeWidth:1 })
    )
  );
  const CourtSurfaceIcon = ({ className='h-2 w-2', title='Surface' }) => (
    React.createElement('svg', { viewBox:'0 0 22 22', className, xmlns:'http://www.w3.org/2000/svg', fill:'none', stroke:'currentColor', strokeWidth:1.8, strokeLinecap:'round', strokeLinejoin:'round', role:'img', 'aria-label':title },
      title ? React.createElement('title', null, title) : null,
      React.createElement('path', { d:'M4 8c1-.8 2-.8 3 0s2 .8 3 0 2-.8 3 0 2 .8 3 0 2-.8 3 0' }),
      React.createElement('path', { d:'M4 12c1-.8 2-.8 3 0s2 .8 3 0 2-.8 3 0 2 .8 3 0 2-.8 3 0' }),
      React.createElement('path', { d:'M4 16c1-.8 2-.8 3 0s2 .8 3 0 2-.8 3 0 2 .8 3 0 2-.8 3 0' })
    )
  );
  const FloodlitIcon = ({ className='h-5 w-5', title='Floodlit' }) => (
    React.createElement('svg', { viewBox:'0 0 24 24', className, xmlns:'http://www.w3.org/2000/svg', fill:'none', stroke:'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round', role:'img', 'aria-label':title },
      title ? React.createElement('title', null, title) : null,
      React.createElement('circle', { cx:12, cy:8, r:5 }),
      React.createElement('path', { d:'M9 14v2a3 3 0 006 0v-2' })
    )
  );
  const IndoorIcon = ({ className='h-5 w-5', title='Indoor' }) => (
    React.createElement('svg', { viewBox:'0 0 24 24', className, xmlns:'http://www.w3.org/2000/svg', fill:'none', stroke:'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round', role:'img', 'aria-label':title },
      title ? React.createElement('title', null, title) : null,
      // House / building icon (stroke-only to match other icons)
      React.createElement('path', { d:'M3 11 L12 4 L21 11' }),
      React.createElement('path', { d:'M5 11v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8' }),
      React.createElement('rect', { x:10, y:14, width:4, height:5, rx:0.5, fill:'none' }),
      React.createElement('line', { x1:12, y1:14, x2:12, y2:19 })
    )
  );

  const OutdoorIcon = ({ className='h-[14px] w-[14px]', title='Outdoor' }) => (
    React.createElement('svg', { viewBox:'0 0 24 24', className, xmlns:'http://www.w3.org/2000/svg', fill:'none', stroke:'currentColor', strokeWidth:5, strokeLinecap:'round', strokeLinejoin:'round', role:'img', 'aria-label':title },
      title ? React.createElement('title', null, title) : null,
      // Original 74x74 path scaled to 24x24 via transform so it aligns with other icons
      React.createElement('path', { d: 'M36 0V1V8V9H38V8V1V0H36ZM11.5312 10.125L10.125 11.5312L10.8438 12.25L15.7812 17.1875L16.5 17.9062L17.9062 16.4687L17.1875 15.7812L12.25 10.8125L11.5312 10.125ZM62.4688 10.125L61.75 10.8125L56.8125 15.7812L56.0938 16.4687L57.5 17.9062L58.2188 17.1875L63.1562 12.25L63.875 11.5312L62.4688 10.125ZM37 16C25.414 16 16.0001 25.4139 16 37C16.0001 48.5861 25.414 58 37 58C48.5861 58 58.0001 48.5861 58 37C58.0001 25.4139 48.5861 16 37 16ZM37 18C47.5053 18 56.0001 26.4948 56 37C56.0001 47.5052 47.5053 56 37 56C26.4948 56 18.0001 47.5052 18 37C18.0001 26.4948 26.4948 18 37 18ZM0 36V38H1H8H9V36H8H1H0ZM65 36V38H66H73H74V36H73H66H65ZM16.5 56.0937L15.7812 56.7812L10.8438 61.75L10.125 62.4375L11.5312 63.8438L12.25 63.1562L17.1875 58.1875L17.9062 57.5L16.5 56.0937ZM57.5 56.0937L56.0938 57.5L56.8125 58.1875L61.75 63.1562L62.4688 63.8438L63.875 62.4375L63.1562 61.75L58.2188 56.7812L57.5 56.0937ZM36 65V66V73V74H38V73V66V65H36Z', transform:'scale(0.2943243243)', fill:'none' })
    )
  );

  const WebsiteIcon = ({ className='h-4 w-4', title='Website' }) => (
    React.createElement('svg', { viewBox: '0 0 17 15', className, xmlns: 'http://www.w3.org/2000/svg', fill: 'currentColor', role: 'img', 'aria-label': title, stroke:'currentColor', strokeWidth:.75,  },
      title ? React.createElement('title', null, title) : null,
    React.createElement('path', { d: 'M0.000714363 7.49972V7.50046C0.000714363 9.54693 0.825416 11.4036 2.15847 12.758C2.16653 12.7697 2.17531 12.7815 2.1863 12.7917C2.19509 12.8005 2.20534 12.8078 2.21487 12.8151C3.57205 14.1651 5.44043 15 7.50069 15C9.56169 15 11.4316 14.1643 12.788 12.8136C12.7975 12.8063 12.8063 12.7997 12.8151 12.7917C12.8246 12.7822 12.8334 12.7712 12.8407 12.7602C14.1752 11.4051 15 9.54684 15 7.49962C15 5.4524 14.1753 3.59418 12.8407 2.23981C12.8327 2.22882 12.8246 2.21783 12.8144 2.20758C12.8056 2.19879 12.7961 2.1922 12.7873 2.1856C11.4301 0.835689 9.56096 0 7.49996 0C5.4397 0 3.57126 0.834996 2.21413 2.18485C2.20388 2.19218 2.19436 2.1995 2.18484 2.20829C2.17458 2.21855 2.16506 2.23027 2.157 2.24198C0.823989 3.59631 0 5.45307 0 7.49955V7.50028L0.000714363 7.49972ZM2.37822 2.76006C3.0374 3.37826 3.78959 3.86387 4.60254 4.20446C4.4143 5.12222 4.3037 6.14837 4.28905 7.24117H0.523672C0.58666 5.51477 1.27958 3.94662 2.37822 2.76006ZM7.50073 0.516518C8.37525 0.516518 9.29151 1.7822 9.79836 3.8793C9.0696 4.13274 8.29543 4.26458 7.49998 4.26458C6.7053 4.26458 5.93113 4.132 5.20235 3.8793C5.70991 1.7822 6.62544 0.516518 7.50073 0.516518ZM14.4786 7.24115H10.7124C10.697 6.14833 10.5864 5.12211 10.3989 4.20444C11.2119 3.86385 11.9641 3.37749 12.624 2.76004C13.7234 3.94735 14.4155 5.51473 14.4792 7.24113L14.4786 7.24115ZM12.6233 12.2394C11.9634 11.6212 11.212 11.1356 10.3983 10.795C10.5865 9.87722 10.6971 8.85108 10.7117 7.75828H14.4779C14.4149 9.48467 13.722 11.0528 12.6233 12.2394ZM7.50082 14.4829C6.6263 14.4829 5.71004 13.2172 5.20244 11.1201C5.9312 10.8667 6.70537 10.7349 7.50007 10.7349C8.29476 10.7349 9.06893 10.8674 9.79845 11.1201C9.29089 13.2172 8.37536 14.4829 7.50007 14.4829H7.50082ZM6.17514 14.3562C4.86483 14.1035 3.68345 13.4831 2.74369 12.6064C3.33183 12.0578 3.99907 11.6212 4.71901 11.3085C5.05226 12.654 5.55991 13.7219 6.17514 14.3562ZM10.1948 7.75815C10.1801 8.80777 10.0769 9.76656 9.90987 10.6103C9.14376 10.3518 8.33295 10.2163 7.50011 10.2163C6.66808 10.2163 5.85656 10.3511 5.09036 10.6103C4.92336 9.76656 4.82009 8.80777 4.80545 7.75815H10.1948ZM4.80639 7.24104C4.82103 6.19142 4.92431 5.23263 5.09129 4.38884C5.8574 4.6474 6.66821 4.78291 7.50105 4.78291C8.33389 4.78291 9.1446 4.64814 9.9108 4.38884C10.0778 5.23263 10.1811 6.19142 10.1957 7.24104H4.80639ZM10.2827 11.3083C11.0027 11.6211 11.6699 12.0576 12.258 12.6062C11.3183 13.4822 10.137 14.1034 8.82583 14.356C9.44106 13.7217 9.94864 12.6538 10.2819 11.3083L10.2827 11.3083ZM10.2827 3.69075C9.94946 2.34522 9.44188 1.27732 8.82666 0.642978C10.1377 0.895683 11.3183 1.51606 12.2589 2.39281C11.6707 2.94142 11.0035 3.37796 10.2835 3.69073L10.2827 3.69075ZM4.7192 3.69075C3.99923 3.37798 3.332 2.94217 2.74388 2.39283C3.68358 1.51681 4.86489 0.895683 6.17533 0.642997C5.5601 1.2773 5.05244 2.3452 4.7192 3.69075ZM4.28926 7.758C4.30464 8.85082 4.41524 9.87704 4.60274 10.7947C3.78976 11.1353 3.03755 11.6209 2.37843 12.2391C1.27979 11.0518 0.586915 9.48441 0.523934 7.75802H4.29007L4.28926 7.758Z' }))
  );

  Object.assign(global, { Logo, SearchIcon, ListIcon, MapViewIcon, CourtIcon, CourtSurfaceIcon, FloodlitIcon, IndoorIcon, OutdoorIcon, WebsiteIcon });
})(window);
