import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SubnetCalculator from '../../components/widgets/SubnetCalculator';

// SubnetCalculator uses window.innerWidth for initial position
Object.defineProperty(window, 'innerWidth', { value: 1280, writable: true });

describe('SubnetCalculator', () => {
  it('renders the calculator title', () => {
    render(<SubnetCalculator onClose={() => {}} />);
    expect(screen.getByText('IP Subnet Calculator')).toBeInTheDocument();
  });

  it('renders the IP input with default value', () => {
    render(<SubnetCalculator onClose={() => {}} />);
    const inputs = screen.getAllByRole('textbox');
    expect(inputs.length).toBeGreaterThan(0);
    expect(inputs[0].value).toBe('192.168.1.0');
  });

  it('renders the CIDR select with default value 24', () => {
    render(<SubnetCalculator onClose={() => {}} />);
    const select = screen.getByRole('combobox');
    expect(select.value).toBe('24');
  });

  it('displays network results for valid IP', () => {
    render(<SubnetCalculator onClose={() => {}} />);
    // Default is 192.168.1.0/24, so Network row should show
    expect(screen.getByText('Network')).toBeInTheDocument();
    expect(screen.getByText('192.168.1.0')).toBeInTheDocument();
  });

  it('displays broadcast address', () => {
    render(<SubnetCalculator onClose={() => {}} />);
    expect(screen.getByText('Broadcast')).toBeInTheDocument();
    expect(screen.getByText('192.168.1.255')).toBeInTheDocument();
  });

  it('displays usable hosts count', () => {
    render(<SubnetCalculator onClose={() => {}} />);
    expect(screen.getByText('Usable Hosts')).toBeInTheDocument();
    // 254 usable hosts for /24
    expect(screen.getByText('254')).toBeInTheDocument();
  });

  it('shows invalid message for bad IP', () => {
    render(<SubnetCalculator onClose={() => {}} />);
    const input = screen.getAllByRole('textbox')[0];
    fireEvent.change(input, { target: { value: 'invalid' } });
    expect(screen.getByText('Invalid IP address')).toBeInTheDocument();
  });

  it('updates results when IP changes', () => {
    render(<SubnetCalculator onClose={() => {}} />);
    const input = screen.getAllByRole('textbox')[0];
    fireEvent.change(input, { target: { value: '10.0.0.0' } });
    // Network should update to 10.0.0.0 for /24
    expect(screen.getByText('10.0.0.0')).toBeInTheDocument();
  });

  it('updates results when CIDR changes', () => {
    render(<SubnetCalculator onClose={() => {}} />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '16' } });
    // For 192.168.1.0/16, broadcast should be 192.168.255.255
    expect(screen.getByText('192.168.255.255')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<SubnetCalculator onClose={onClose} />);
    // The X close button — find by looking for button near title
    // The last button in the header is the close button
    const buttons = screen.getAllByRole('button');
    // Close button (X) is the last button in the header
    const closeBtn = buttons[buttons.length - 1];
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it('collapses/expands when chevron button is clicked', () => {
    render(<SubnetCalculator onClose={() => {}} />);
    // Initially expanded — results visible
    expect(screen.getByText('Network')).toBeInTheDocument();

    // Find all buttons — the collapse/expand chevron is second-to-last in header
    const buttons = screen.getAllByRole('button');
    const collapseBtn = buttons[buttons.length - 2];
    fireEvent.click(collapseBtn);

    // After collapse, results should not be visible
    expect(screen.queryByText('Network')).not.toBeInTheDocument();
  });
});
