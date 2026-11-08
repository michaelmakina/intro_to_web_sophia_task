const donation_options = {
    min: 10,
    max: 50000,
    presets: [
        { amount: 50, impact: 'feeds a rescued cat for a week' },
        { amount: 100, impact: 'buys a warm bed for a shelter dog' },
        { amount: 250, impact: 'vaccinates two puppies' },
        { amount: 500, impact: 'covers a spay or neuter operation' }
    ]
};



function setup_menu() {
    const menu_toggle = document.querySelector('.mobile_menu_button');
    const menu = document.querySelector('.menu_items_wrapper');
    if (!menu_toggle || !menu) return;

    menu_toggle.addEventListener('click', () => {
        const is_open = menu.classList.toggle('show');
        menu_toggle.setAttribute('aria-expanded', is_open);
    });
}



class Validator {

    // The only classes the validator may add to a .form_group
    static statuses = ['form_error', 'form_success'];

    // Each check returns true if the field passes
    static checks = {
        required: (element) => element.tagName === 'FIELDSET' ? element.querySelector('input:checked') !== null : element.value.trim() !== '',
        min: (element, length) => element.value.trim().length >= Number(length),
        max: (element, length) => element.value.trim().length <= Number(length),
        email: (element) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(element.value.trim()),
        numeric: (element) => /^\d+(\.\d{1,2})?$/.test(element.value.trim()),
        // 'between:10,50000' -> value must be from 10 to 50000
        between: (element, range) => {
            const [low, high] = range.split(',').map(Number);
            const value = Number(element.value.trim());
            return value >= low && value <= high;
        },
        // Zambian mobile number: 10 digits starting 07 or 09 (spaces allowed)
        phone: (element) => /^0[79]\d{8}$/.test(element.value.replace(/\s/g, ''))
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

        if (element.disabled) {
            this.set_status(element);
            return true;
        }

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

    // Checks every field (map runs them all, so every error shows at once)
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

    focus_first_error() {
        this.form.querySelector('.form_error input, .form_error select, .form_error textarea')?.focus();
    }

    // Empties the form and clears every field's status
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


class DonationStore {

    static key = 'tcar_donation';

    static defaults() {
        return {
            amount: '100',
            custom: '',
            donor: null,
            history: []
        };
    }

    constructor() {
        this.data = this.load();
    }

    // try/catch: storage can be blocked (e.g. private browsing)
    load() {
        try {
            const saved = JSON.parse(localStorage.getItem(DonationStore.key));
            return { ...DonationStore.defaults(), ...saved };
        } catch {
            return DonationStore.defaults();
        }
    }

    save() {
        try {
            localStorage.setItem(DonationStore.key, JSON.stringify(this.data));
        } catch {
            // Storage unavailable: the site still works, it just won't remember
        }
    }

    save_choice(amount, custom) {
        this.data.amount = amount;
        this.data.custom = custom;
        this.save();
    }

    record(amount, donor) {
        const reference = 'TCAR-' + Date.now().toString().slice(-6);
        const date = new Date().toISOString().slice(0, 10);   // 'YYYY-MM-DD'

        this.data.history.push({ reference, amount, date });
        this.data.donor = donor;
        this.save();
        return reference;
    }

    total_given() {
        return this.data.history.reduce((total, donation) => total + donation.amount, 0);
    }
}


function render_donation_modal() {
    const amount_options = donation_options.presets.map((preset) => `
        <div>
            <input type="radio" id="amount_${preset.amount}" name="amount" value="${preset.amount}">
            <label for="amount_${preset.amount}">ZMW ${preset.amount}</label>
        </div>`).join('');

    document.body.insertAdjacentHTML('beforeend', `
        <dialog class="donation_modal" id="donation_modal" aria-labelledby="donation_title">
            <div class="modal_inner">
                <div class="modal_header">
                    <h2 id="donation_title">Make a Donation</h2>
                    <button type="button" class="modal_close" aria-label="Close donation form" data-close-donation>&times;</button>
                </div>

                <form class="form" id="donation_form" novalidate>
                    <fieldset class="form_group" id="donation_amount">
                        <legend>Choose an amount</legend>
                        <div class="option_chips">
                            ${amount_options}
                            <div>
                                <input type="radio" id="amount_other" name="amount" value="other">
                                <label for="amount_other">Other</label>
                            </div>
                        </div>
                        <div class="form_message" aria-live="polite"></div>
                    </fieldset>

                    <div class="form_group" id="custom_amount_group" hidden>
                        <label for="donation_custom">Your amount (ZMW)</label>
                        <input type="text" inputmode="decimal" id="donation_custom" name="custom" disabled>
                        <div class="form_message" aria-live="polite"></div>
                    </div>

                    <p class="donation_impact" id="donation_impact" aria-live="polite"></p>

                    <div class="form_group">
                        <label for="donor_name">Full Name</label>
                        <input type="text" id="donor_name" name="donor_name" autocomplete="name">
                        <div class="form_message" aria-live="polite"></div>
                    </div>

                    <div class="form_group">
                        <label for="donor_email">Email Address</label>
                        <input type="email" id="donor_email" name="donor_email" autocomplete="email">
                        <div class="form_message" aria-live="polite"></div>
                    </div>

                    <div class="form_group">
                        <label for="donor_phone">Mobile Money Number (Airtel or MTN)</label>
                        <input type="tel" id="donor_phone" name="donor_phone" autocomplete="tel" placeholder="e.g. 097 123 4567">
                        <div class="form_message" aria-live="polite"></div>
                    </div>

                    <p class="demo_note">Demo only: no payment will be taken.</p>
                    <button type="submit" class="button" id="donation_submit">Donate</button>
                </form>

                <div class="donation_thanks" id="donation_thanks" hidden aria-live="polite">
                    <h3 id="thanks_title"></h3>
                    <p id="thanks_summary"></p>
                    <p class="demo_note" id="thanks_reference"></p>
                    <button type="button" class="button" data-close-donation>Close</button>
                </div>
            </div>
        </dialog>`);
}

// Connects the modal to the store
function setup_donations(store) {
    const modal = document.getElementById('donation_modal');
    const form = document.getElementById('donation_form');
    const custom_group = document.getElementById('custom_amount_group');
    const custom_input = document.getElementById('donation_custom');
    const impact = document.getElementById('donation_impact');
    const submit_button = document.getElementById('donation_submit');
    const thanks = document.getElementById('donation_thanks');

    const validator = new Validator(form, {
        donation_amount: ['required'],
        donation_custom: ['required', 'numeric', `between:${donation_options.min},${donation_options.max}`],
        donor_name: ['required', 'min:2'],
        donor_email: ['required', 'email'],
        donor_phone: ['required', 'phone']
    }, {
        'donation_amount.required': 'Please choose an amount.',
        'donation_custom.required': 'Please enter the amount you would like to give.',
        'donation_custom.numeric': 'Please enter numbers only, e.g. 150.',
        'donation_custom.between': `Please enter an amount between ZMW ${donation_options.min} and ZMW ${donation_options.max.toLocaleString()}.`,
        'donor_name.required': 'Please enter your full name.',
        'donor_name.min': 'Your name must be at least 2 characters.',
        'donor_email.required': 'Please enter your email address.',
        'donor_email.email': 'Please enter a valid email address, e.g. name@example.com.',
        'donor_phone.required': 'Please enter your mobile money number.',
        'donor_phone.phone': 'Please enter a 10-digit number starting with 07 or 09.'
    });
    validator.watch();

    // Value of the ticked radio in a group, e.g. selected('amount') -> '250'
    function selected(name) {
        return form.querySelector(`input[name="${name}"]:checked`)?.value;
    }

    function current_amount() {
        return selected('amount') === 'other' ? Number(custom_input.value) : Number(selected('amount'));
    }

    function update_summary() {
        const is_other = selected('amount') === 'other';
        custom_group.hidden = !is_other;
        custom_input.disabled = !is_other;

        const amount = current_amount();
        const preset = donation_options.presets.find((p) => p.amount === amount);

        impact.textContent = preset
            ? `ZMW ${amount} ${preset.impact}.`
            : 'Every kwacha goes straight to caring for our animals.';

        submit_button.textContent = amount > 0 ? `Donate ZMW ${amount}` : 'Donate';

        store.save_choice(selected('amount'), is_other ? custom_input.value : '');
    }

    function fill_from_store() {
        const { amount, custom, donor } = store.data;

        const amount_radio = form.querySelector(`input[name="amount"][value="${amount}"]`);
        if (amount_radio) amount_radio.checked = true;
        custom_input.value = custom;

        if (donor) {
            form.donor_name.value ||= donor.name;
            form.donor_email.value ||= donor.email;
            form.donor_phone.value ||= donor.phone;
        }
        update_summary();
    }

    function open() {
        form.hidden = false;
        thanks.hidden = true;
        fill_from_store();
        modal.showModal();
    }

    function show_thanks(reference, amount, name) {
        document.getElementById('thanks_title').textContent = `Thank you, ${name.split(' ')[0]}!`;
        document.getElementById('thanks_summary').textContent =
            `Your gift of ZMW ${amount} will make a real difference. ` +
            `You have given ZMW ${store.total_given().toLocaleString()} in total.`;
        document.getElementById('thanks_reference').textContent = `Reference: ${reference}`;

        form.hidden = true;
        thanks.hidden = false;
    }

    document.addEventListener('click', (event) => {
        if (event.target.closest('[data-open-donation]')) open();
        if (event.target.closest('[data-close-donation]')) modal.close();
    });

    modal.addEventListener('click', (event) => {
        if (event.target === modal) modal.close();
    });

    form.addEventListener('input', update_summary);

    form.addEventListener('submit', (event) => {
        event.preventDefault();

        if (!validator.passes()) {
            validator.focus_first_error();
            return;
        }

        const amount = current_amount();
        const donor = {
            name: form.donor_name.value.trim(),
            email: form.donor_email.value.trim(),
            phone: form.donor_phone.value.trim()
        };

        const reference = store.record(amount, donor);
        validator.reset();
        show_thanks(reference, amount, donor.name);
    });
}


function setup_contact_form(store) {
    const contact_form = document.getElementById('contact_form');
    if (!contact_form) return;

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

    if (store.data.donor) {
        document.getElementById('name').value ||= store.data.donor.name;
        document.getElementById('email').value ||= store.data.donor.email;
    }

    function show_form_status(status, message) {
        form_status.className = 'form_status ' + status;
        form_status.textContent = message;
    }

    contact_form.addEventListener('submit', (event) => {
        event.preventDefault();   // no server yet, so never really submit

        if (!validator.passes()) {
            show_form_status('form_error', 'Please fix the highlighted fields and try again.');
            validator.focus_first_error();
            return;
        }

        validator.reset();
        show_form_status('form_success', 'Thank you! Your form has been sent. A member of our team will be in touch soon.');
    });

    validator.watch();
}


function init() {
    setup_menu();

    const store = new DonationStore();
    render_donation_modal();
    setup_donations(store);
    setup_contact_form(store);
}

init();
