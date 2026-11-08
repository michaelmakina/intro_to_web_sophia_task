
const menu_toggle = document.querySelector('.mobile_menu_button');
const menu = document.querySelector('.menu_items_wrapper');

if (menu_toggle && menu) {
    menu_toggle.addEventListener('click', () => {
        const is_open = menu.classList.toggle('show');
        menu_toggle.setAttribute('aria-expanded', is_open);
    });
}



class Validator {

    static statuses = ['form_error', 'form_success'];

    // Each check returns true if the field passes
    static checks = {
        required: (element) => element.tagName === 'FIELDSET' ? element.querySelector('input:checked') !== null : element.value.trim() !== '',
        min: (element, length) => element.value.trim().length >= Number(length),
        max: (element, length) => element.value.trim().length <= Number(length),
        email: (element) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(element.value.trim())
    };

    constructor(form, rules, messages) {
        this.form = form;
        this.rules = rules;
        this.messages = messages;
    }

    field(name) {
        return this.form.querySelector('#' + name);
    }

    validate(name) {
        const element = this.field(name);

        for (const rule of this.rules[name]) {
            const [check, param] = rule.split(':');   // 'min:2' -> 'min', '2'

            if (!Validator.checks[check](element, param)) {
                this.set_status(element, 'form_error', this.messages[name + '.' + check]);
                return false;
            }
        }

        this.set_status(element, 'form_success');
        return true;
    }

    passes() {
        return Object.keys(this.rules).map((name) => this.validate(name)).every(Boolean);
    }

    set_status(element, status = '', message = '') {
        const group = element.closest('.form_group');
        if (!group || (status && !Validator.statuses.includes(status))) {
            return;
        }

        group.classList.remove(...Validator.statuses);
        if (status) {
            group.classList.add(status);
        }
        group.querySelector('.form_message').textContent = message;
    }

    reset() {
        this.form.reset();
        this.form.querySelectorAll('.form_group').forEach((group) => this.set_status(group));
    }

    watch() {
        for (const name in this.rules) {
            const element = this.field(name);

            element.addEventListener('input', () => {
                if (element.closest('.form_group').classList.contains('form_error')) {
                    this.validate(name);
                }
            });
        }
    }
}


const contact_form = document.getElementById('contact_form');

if (contact_form) {
    const form_status = document.getElementById('form_status');

    const validator = new Validator(contact_form, {
        name: ['required', 'min:2'],
        email: ['required', 'email'],
        interest: ['required'],
        availability: ['required'],
        experience: ['required'],
        message: ['required', 'min:20', 'max:500']
    }, {
        'name.required': 'Please enter your full name.',
        'name.min': 'Your name must be at least 2 characters.',
        'email.required': 'Please enter your email address.',
        'email.email': 'Please enter a valid email address, e.g. name@example.com.',
        'interest.required': 'Please choose what you are interested in.',
        'availability.required': 'Please select at least one time you are available.',
        'experience.required': 'Please tell us about your experience with pets.',
        'message.required': 'Please write a short message.',
        'message.min': 'Your message must be at least 20 characters.',
        'message.max': 'Your message must be 500 characters or fewer.'
    });

    // Shows the overall result under the submit button
    function show_form_status(status, message) {
        form_status.className = 'form_status ' + status;
        form_status.textContent = message;
    }

    contact_form.addEventListener('submit', (event) => {
        event.preventDefault();   // no server yet, so never really submit

        if (!validator.passes()) {
            show_form_status('form_error', 'Please fix the highlighted fields and try again.');
            contact_form.querySelector('.form_error input, .form_error select, .form_error textarea').focus();
            return;
        }

        validator.reset();
        show_form_status('form_success', 'Thank you! Your form has been sent. A member of our team will be in touch soon.');
    });

    validator.watch();
}


