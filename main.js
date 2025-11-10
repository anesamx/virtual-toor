class FeatureCard extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    const wrapper = document.createElement('div');
    wrapper.setAttribute('class', 'card');

    const image = document.createElement('img');
    image.setAttribute('src', this.getAttribute('image'));

    const title = document.createElement('h3');
    title.textContent = this.getAttribute('title');

    const description = document.createElement('p');
    description.textContent = this.getAttribute('description');

    const style = document.createElement('style');
    style.textContent = `
      .card {
        background-color: var(--secondary-color);
        border-radius: var(--border-radius);
        box-shadow: var(--box-shadow);
        padding: 1.5rem;
        max-width: 300px;
        text-align: center;
      }
      img {
        width: 100%;
        border-radius: var(--border-radius);
      }
    `;

    shadow.appendChild(style);
    shadow.appendChild(wrapper);
    wrapper.appendChild(image);
    wrapper.appendChild(title);
    wrapper.appendChild(description);
  }
}

customElements.define('feature-card', FeatureCard);
