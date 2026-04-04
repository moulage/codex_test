# TimePetBackground

面向下一迭代 React 版本的时段宠物背景模块，视觉思路参考 `particles.js` 的漂浮粒子氛围，但更偏儿童化。

## 使用

```js
const React = require('react');
const { TimePetBackground } = require('./TimePetBackground');
require('./TimePetBackground.css');

function Demo() {
  return React.createElement(TimePetBackground, {
    period: 'night',
    petName: '泡泡'
  });
}
```

## period

- `dawn`
- `morning`
- `afternoon`
- `night`
