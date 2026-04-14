import React, { useEffect, useState } from 'react';
import './TimePetBackground.css';

export const PERIOD_THEME = {
  dawn: {
    label: '晨曦',
    title: '清晨的云朵热气球',
    subtitle: '暖金色的微光刚刚亮起，宠物像要出发去寻找第一颗勇气星。',
    chips: ['露珠', '热气球', '晨星'],
    particles: ['✦', '☁', '●', '✧', '◎'],
    accentWord: '早安'
  },
  morning: {
    label: '上午',
    title: '阳光操场已经打开',
    subtitle: '跳动的小泡泡和软乎乎的云团一起飘起来，特别适合开始一天的任务。',
    chips: ['阳光', '泡泡', '小风车'],
    particles: ['☀', '●', '✦', '◌', '✿'],
    accentWord: '出发'
  },
  afternoon: {
    label: '下午',
    title: '彩色风筝在空中巡游',
    subtitle: '暖橙和青草绿混在一起，像在公园里奔跑，画面更热闹也更有动感。',
    chips: ['风筝', '树叶', '彩带'],
    particles: ['◆', '✦', '🍃', '●', '◌'],
    accentWord: '冲呀'
  },
  night: {
    label: '夜晚',
    title: '星光和萤火虫都醒了',
    subtitle: '深蓝夜空里有会发光的小粒子，宠物像在睡前故事世界里慢慢漂浮。',
    chips: ['月亮', '星星', '萤火虫'],
    particles: ['✦', '✧', '☾', '●', '◌'],
    accentWord: '晚安'
  }
};

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function buildParticles(period, count = 22) {
  const particleSet = PERIOD_THEME[period]?.particles || PERIOD_THEME.morning.particles;

  return Array.from({ length: count }, (_, index) => ({
    id: `${period}-${index}`,
    symbol: particleSet[index % particleSet.length],
    left: `${randomBetween(4, 96).toFixed(2)}%`,
    top: `${randomBetween(8, 90).toFixed(2)}%`,
    size: `${randomBetween(14, 34).toFixed(0)}px`,
    duration: `${randomBetween(8, 18).toFixed(2)}s`,
    delay: `${randomBetween(-10, 0).toFixed(2)}s`,
    driftX: `${randomBetween(-36, 36).toFixed(0)}px`,
    driftY: `${randomBetween(-42, 24).toFixed(0)}px`,
    opacity: randomBetween(0.3, 0.92).toFixed(2),
    blur: `${randomBetween(0, 2.4).toFixed(1)}px`
  }));
}

export function TimePetBackground({ period = 'morning', petName = '泡泡', title, subtitle, className = '', compact = false }) {
  const theme = PERIOD_THEME[period] || PERIOD_THEME.morning;
  const [particles, setParticles] = useState(() => buildParticles(period));

  useEffect(() => {
    setParticles(buildParticles(period));
  }, [period]);

  return (
    <section className={`tpb-shell theme-${period}${compact ? ' compact' : ''}${className ? ` ${className}` : ''}`}>
      <div className="tpb-gradient" />
      <div className="tpb-mesh" />
      <div className="tpb-orbit tpb-orbit-a" aria-hidden="true" />
      <div className="tpb-orbit tpb-orbit-b" aria-hidden="true" />
      <div className="tpb-horizon" aria-hidden="true" />

      <div className="tpb-particles" aria-hidden="true">
        {particles.map((particle) => (
          <span
            key={particle.id}
            className="tpb-particle"
            style={{
              left: particle.left,
              top: particle.top,
              fontSize: particle.size,
              opacity: particle.opacity,
              filter: `blur(${particle.blur})`,
              animationDuration: particle.duration,
              animationDelay: particle.delay,
              '--tpb-drift-x': particle.driftX,
              '--tpb-drift-y': particle.driftY
            }}
          >
            {particle.symbol}
          </span>
        ))}
      </div>

      <div className="tpb-content">
        {!compact ? (
          <>
            <p className="tpb-kicker">{theme.label}</p>
            <h2 className="tpb-title">{title || theme.title}</h2>
            <p className="tpb-subtitle">{subtitle || theme.subtitle}</p>

            <div className="tpb-chip-row">
              {theme.chips.map((chip) => (
                <span key={chip} className="tpb-chip">
                  {chip}
                </span>
              ))}
            </div>
          </>
        ) : null}

        <div className="tpb-pet-badge" aria-hidden="true">
          <span className="tpb-pet-halo" />
        </div>
      </div>
    </section>
  );
}
